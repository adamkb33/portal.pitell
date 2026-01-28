import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

import { cleanDir, listFiles } from './fs-utils';
import type { ApiName } from './types';

export function extractServicesAndRewrite(_api: ApiName, genRoot: string, outRoot: string) {
  cleanDir(outRoot);
  const srcServices = join(genRoot, 'services');
  const dstServices = join(outRoot, 'services');
  mkdirSync(dstServices, { recursive: true });

  for (const file of listFiles(srcServices, '.ts')) {
    const rel = relative(srcServices, file);
    const out = join(dstServices, rel);
    mkdirSync(dirname(out), { recursive: true });
    let code = readFileSync(file, 'utf-8');

    code = code.replace(/\/\*[\s\S]*?do not edit[\s\S]*?\*\//gi, '');
    code = code.replace(/from\s+['"]\.\.\/models\/[^'"]+['"]/g, `from '@types'`);
    code = code.replace(/from\s+['"]\.\.\/schemas\/[^'"]+['"]/g, `from '@types'`);
    code = code.replace(/from\s+['"]\.\.\/core\/[^'"]+['"]/g, `from '@http'`);

    writeFileSync(out, code);
  }
}
