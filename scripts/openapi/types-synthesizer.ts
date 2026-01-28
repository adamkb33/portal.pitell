import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { TYPES_DIR } from './config';
import { listFiles } from './fs-utils';
import { escapeReg, normalizeText, pascal, sha } from './text-utils';
import type { ApiName, GenPack, MigrationMap, OAS, SpecPack } from './types';

const PRIMITIVES: Record<string, string> = {
  Email: 'string',
  ID: 'string | number',
  DateTime: 'string',
};

const CORE_OVERRIDES: Record<string, string> = {
  ApiError: `export interface ApiError { code: string; message: string; field?: string; details?: string; }`,
  ApiMeta: `export interface ApiMeta { total?: number; requestId?: string; pagination?: PaginationMeta; sorting?: SortingMeta; filtering?: FilteringMeta; }`,
  PaginationMeta: `export interface PaginationMeta { page: number; size: number; totalElements: number; totalPages: number; }`,
  SortingMeta: `export interface SortingMeta { sortBy: string; direction: string; }`,
  FilteringMeta: `export interface FilteringMeta { appliedFilters: Record<string, unknown>; }`,
};

const CORE_ORDER = ['ApiError', 'ApiMeta', 'PaginationMeta', 'SortingMeta', 'FilteringMeta'] as const;

const GENERIC_WRAPPER = `export interface ApiResponse<T> {\n  success: boolean;\n  message: string;\n  data?: T;\n  errors?: ApiError[];\n  meta?: ApiMeta;\n  timestamp: DateTime;\n}`;

type EnumEntry = { name: string; values: string[]; source: string };

export function synthesizeTypesAndZod(specs: SpecPack, gens: GenPack, migration: MigrationMap) {
  mkdirSync(TYPES_DIR, { recursive: true });

  const enumRegistry = collectEnumsFromSpecs(specs);

  const genModels: Array<{ api: ApiName; file: string; name: string; src: string; normHash: string }> = [];
  for (const [api, root] of [
    ['base', gens.baseOut],
    ['booking', gens.bookingOut],
  ] as Array<[ApiName, string]>) {
    const d = join(root, 'models');
    if (!existsSync(d)) continue;
    for (const file of listFiles(d, '.ts')) {
      const name = basename(file).replace(/\.ts$/, '');
      const src = readFileSync(file, 'utf-8');
      if (/class\s+ApiError\b/.test(src)) continue;
      const normHash = sha(normalizeText(src));
      genModels.push({ api, file, name, src, normHash });
    }
  }

  const byName = new Map<string, Array<(typeof genModels)[number]>>();
  genModels.forEach((m) => {
    const arr = byName.get(m.name) ?? [];
    arr.push(m);
    byName.set(m.name, arr);
  });

  const identicalHashes = new Map<string, string>();
  const modelOutputs = new Map<string, string>();

  for (const [name, files] of byName.entries()) {
    if (files.length === 1) {
      writeModel(name, files[0]);
      continue;
    }
    const same = files.every((f) => f.normHash === files[0].normHash);
    if (same) {
      writeModel(name, files[0]);
      migration.merged.push(name);
      identicalHashes.set(files[0].normHash, name);
    } else {
      for (const f of files) {
        const ns = `${f.api === 'base' ? 'Base' : 'Booking'}_${name}`;
        writeModel(ns, f);
        migration.renamed.push({ from: name, to: ns, reason: 'collision' });
      }
    }
  }

  function writeModel(outName: string, m: { api: ApiName; file: string; src: string; name: string }) {
    let code = m.src;

    code = code.replace(
      /\/\*[\s\S]*?(generated using openapi-typescript-codegen|istanbul ignore file|tslint:disable|eslint-disable)[\s\S]*?\*\/\s*/gi,
      '',
    );
    code = code.replace(/^import[^;]+;\s*/gm, '');

    const nsBlocks = extractNamespaces(code);
    for (const { inner } of nsBlocks) {
      const enumMatch = inner.match(/export\s+enum\s+(\w+)\s*\{([\s\S]*?)\}/);
      if (!enumMatch) continue;
      const ename = enumMatch[1];
      const body = enumMatch[2];
      const values = Array.from(body.matchAll(/['"]([^'"]+)['"]/g)).map((x) => x[1]);
      const enumName = guessEnumNameFromNamespace(m.name, ename);
      ensureEnum(enumName, values);
      const dottedRef = new RegExp(`${escapeReg(m.name)}\\.${escapeReg(ename)}`, 'g');
      const replaced = code.replace(dottedRef, enumName);
      if (replaced !== code) {
        code = replaced;
      }
    }

    for (const { block } of nsBlocks) {
      code = code.replace(block, '');
    }

    const liftedEnumRefs = findLiftedEnumRefs(code, m.name);
    for (const { original, lifted } of liftedEnumRefs) {
      const typeRef = new RegExp(`(:\\s*)${escapeReg(original)}(\\b)`, 'g');
      code = code.replace(typeRef, `$1${lifted}$2`);
      const arrayRef = new RegExp(`Array<\\s*${escapeReg(original)}\\s*>`, 'g');
      code = code.replace(arrayRef, `${lifted}[]`);
    }

    for (const e of enumRegistry) {
      const unionRx = new RegExp(
        `Array<\\s*(?:${e.values.map((v) => `'${escapeReg(v)}'`).join('\\s*\\|\\s*')})\\s*>`,
        'g',
      );
      code = code.replace(unionRx, `${e.name}[]`);
      const singleRx = new RegExp(
        `:\\s*(?:${e.values.map((v) => `'${escapeReg(v)}'`).join('\\s*\\|\\s*')})\\s*([;\\]\\n,}])`,
        'g',
      );
      code = code.replace(singleRx, `: ${e.name}$1`);
    }

    code = code.replace(/Array<\s*([A-Za-z0-9_]+)\s*>/g, '$1[]');

    code = code.replace(/:\s*string\s*;\s*\/\/\s*format:\s*email/g, ': Email; // format: email');
    code = code.replace(/:\s*string\s*;\s*\/\/\s*format:\s*date-time/g, ': DateTime; // format: date-time');
    code = code.replace(/\/\*[\s\S]*?do not edit[\s\S]*?\*\//gi, '');
    code = code.replace(/;\s*\n\}\s*\n/g, ';\n');
    code = code.replace(/\n{3,}/g, '\n\n');

    code = convertTypeAliasToInterface(code, outName);
    modelOutputs.set(outName, code);

    function ensureEnum(enumName: string, values: string[]) {
      if (!enumRegistry.some((e) => e.name === enumName)) {
        enumRegistry.push({ name: enumName, values, source: `namespace:${enumName}` });
      }
    }
  }

  const files = buildTypeFiles({ enumRegistry, modelOutputs });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(TYPES_DIR, `${name}.ts`), `${content.trimEnd()}\n`);
  }
}

function collectEnumsFromSpecs(specs: SpecPack) {
  const out: EnumEntry[] = [];
  const add = (name: string, values: string[], source: string) => {
    if (out.some((e) => e.name === name && arrEq(e.values, values))) return;
    out.push({ name, values, source });
  };

  for (const [apiName, spec] of [
    ['base', specs.baseSpec],
    ['booking', specs.bookingSpec],
  ] as Array<[ApiName, OAS]>) {
    const schemas = spec?.components?.schemas || {};
    for (const [schemaName, schema] of Object.entries<any>(schemas)) {
      if (Array.isArray(schema.enum) && schema.type === 'string') {
        add(enumNameFromTop(schemaName, apiName), schema.enum, `${apiName}.${schemaName}`);
      }
      const props = schema?.properties || {};
      for (const [propName, prop] of Object.entries<any>(props)) {
        const inner = prop?.items ?? prop;
        if (Array.isArray(inner?.enum) && inner.type === 'string') {
          const name = enumNameFromProp(schemaName, propName, apiName);
          add(name, inner.enum, `${apiName}.${schemaName}.${propName}`);
        }
      }
    }
  }

  return out;
}

function enumNameFromProp(parent: string, prop: string, _api: ApiName) {
  if (/^userRoles?$/i.test(prop)) return 'UserRole';
  if (/^role$/i.test(prop) && /CompanyRoleAssignmentDto$/.test(parent)) return 'CompanyRole';
  return pascal(prop);
}

function enumNameFromTop(name: string, _api: ApiName) {
  // Map Roles schema to CompanyRole
  if (name === 'Roles') return 'CompanyRole';
  return pascal(name);
}

function guessEnumNameFromNamespace(parentModel: string, enumKey: string) {
  if (/^role$/i.test(enumKey) && /CompanyRoleAssignmentDto$/.test(parentModel)) return 'CompanyRole';
  return pascal(enumKey);
}

const arrEq = (a: string[], b: string[]) => {
  const as = a.slice().sort().join('|');
  const bs = b.slice().sort().join('|');
  return as === bs;
};

function findLiftedEnumRefs(src: string, modelName: string) {
  const candidates: Array<{ original: string; lifted: string }> = [];
  if (/CompanyRoleAssignmentDto\b/.test(modelName) && /\brole\b/.test(src)) {
    candidates.push({ original: 'role', lifted: 'CompanyRole' });
  }
  return candidates;
}

function extractNamespaces(code: string) {
  const out: Array<{ name: string; block: string; inner: string }> = [];
  const nsRegex = /export\s+namespace\s+(\w+)\s*\{/g;
  let match: RegExpExecArray | null;
  while ((match = nsRegex.exec(code))) {
    const name = match[1];
    let depth = 1;
    let cursor = nsRegex.lastIndex;
    while (depth > 0 && cursor < code.length) {
      const char = code[cursor++];
      if (char === '{') depth += 1;
      else if (char === '}') depth -= 1;
    }
    const block = code.slice(match.index, cursor);
    const innerStart = match.index + match[0].length;
    const inner = code.slice(innerStart, cursor - 1);
    out.push({ name, block, inner });
    nsRegex.lastIndex = match.index + block.length;
  }
  return out;
}

function convertTypeAliasToInterface(code: string, _name: string) {
  let result = code.trim();
  result = result.replace(/^export\s+type\s+(\w+)\s*=\s*{/, 'export interface $1 {');
  result = result.replace(/};?\s*$/s, '}');
  return `${result}\n`;
}

function getResponseAlias(name: string): string | null {
  if (!name.startsWith('ApiResponse')) return null;
  let rest = name.replace('ApiResponse', '') || 'unknown';
  if (rest === 'String') return 'string';
  if (rest === 'Unit') return 'void';
  const isList = rest.startsWith('List') && rest.length > 'List'.length;
  if (isList) {
    rest = rest.slice('List'.length) || 'unknown';
  }
  const target = rest;
  return isList ? `${target}[]` : target;
}

function buildTypeFiles({
  enumRegistry,
  modelOutputs,
}: {
  enumRegistry: EnumEntry[];
  modelOutputs: Map<string, string>;
}) {
  const files: Record<string, string> = {};

  const primitiveLines = Object.entries(PRIMITIVES).map(([name, tsType]) => `export type ${name} = ${tsType};`);
  if (primitiveLines.length) files.primitives = formatSection('Primitives', primitiveLines.join('\n'));

  const enumMap = new Map<string, string[]>();
  for (const entry of enumRegistry) {
    if (enumMap.has(entry.name)) continue;
    enumMap.set(entry.name, entry.values);
  }
  if (enumMap.size) {
    const enumLines = Array.from(enumMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, values]) => createEnumBlock(name, values))
      .join('\n\n');
    files.enums = formatSection('Enums', enumLines);
  }

  const coreLines = CORE_ORDER.map((key) => CORE_OVERRIDES[key]).join('\n');
  if (coreLines) files.core = formatSection('Core', coreLines);

  const genericWrapperImports = [
    `import type { ApiError, ApiMeta } from './core';`,
    `import type { DateTime } from './primitives';`,
  ];
  const genericWrapperBody = withImports(genericWrapperImports, GENERIC_WRAPPER.trim());
  files['generic-wrapper'] = formatSection('Generic Wrapper', genericWrapperBody);

  const modelLines: string[] = [];
  const responseLines: string[] = [];
  const entries = Array.from(modelOutputs.entries()).sort(([a], [b]) => a.localeCompare(b));
  const modelNames: string[] = [];
  for (const [name, code] of entries) {
    if (CORE_OVERRIDES[name]) continue;
    const responseTarget = getResponseAlias(name);
    if (responseTarget) {
      responseLines.push(`export type ${name} = ApiResponse<${responseTarget}>;`);
      continue;
    }
    modelNames.push(name);
    modelLines.push(code.trim());
  }

  const enumNames = Array.from(enumMap.keys());
  if (modelLines.length) {
    const modelsBodyRaw = modelLines.join('\n\n');
    const modelsImports = collectImports(modelsBodyRaw, [
      { names: Object.keys(PRIMITIVES), from: './primitives' },
      { names: enumNames, from: './enums' },
      { names: CORE_ORDER.filter((name) => name !== 'ApiError'), from: './core' },
    ]);
    const modelsBody = withImports(modelsImports, modelsBodyRaw.trim());
    files.models = formatSection('Models', modelsBody);
  }
  if (responseLines.length) {
    const responsesBodyRaw = responseLines.join('\n');
    const responsesImports = collectImports(responsesBodyRaw, [
      { names: ['ApiResponse'], from: './generic-wrapper' },
      { names: modelNames, from: './models' },
      { names: enumNames, from: './enums' },
      { names: CORE_ORDER.filter((name) => name !== 'ApiError'), from: './core' },
      { names: Object.keys(PRIMITIVES), from: './primitives' },
    ]);
    const responsesBody = withImports(responsesImports, responsesBodyRaw.trim());
    files.responses = formatSection('Common Responses', responsesBody);
  }

  const exportOrder = ['primitives', 'enums', 'core', 'generic-wrapper', 'models', 'responses'];
  const indexLines = exportOrder.filter((key) => files[key]).map((key) => `export * from './${key}';`);
  files.index = indexLines.join('\n');

  return files;
}

function formatSection(title: string, body: string) {
  return `// ${title}\n${body}`;
}

function withImports(imports: string[], body: string) {
  const lines = imports.filter(Boolean);
  if (!lines.length) return body;
  return `${lines.join('\n')}\n\n${body}`;
}

function collectImports(content: string, sources: Array<{ names: string[]; from: string }>) {
  const imports: string[] = [];
  for (const { names, from } of sources) {
    const used = names
      .filter((name) => name && !definesName(content, name) && new RegExp(`\\b${escapeReg(name)}\\b`).test(content))
      .sort((a, b) => a.localeCompare(b));
    if (!used.length) continue;
    imports.push(`import type { ${used.join(', ')} } from '${from}';`);
  }
  return imports;
}

function definesName(content: string, name: string) {
  const definition = new RegExp(`export\\s+(?:type|interface|class|enum)\\s+${escapeReg(name)}\\b`);
  return definition.test(content);
}

function createEnumBlock(name: string, values: string[]) {
  const entries = values
    .map((value) => {
      const key = enumKeyFromValue(value);
      return `  ${key}: '${value}',`;
    })
    .join('\n');

  const constDecl = `export const ${name} = {\n${entries}\n} as const;`;
  const typeDecl = `export type ${name} = (typeof ${name})[keyof typeof ${name}];`;

  return `${constDecl}\n\n${typeDecl}`;
}

function enumKeyFromValue(value: string) {
  let key = value.replace(/[^A-Za-z0-9_$]/g, '_');
  if (/^[0-9]/.test(key)) key = `_${key}`;
  if (!key.length) key = 'UNKNOWN';
  return key;
}
