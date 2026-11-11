// Started by Playwright's webServer (see playwright.config.ts). Launches throwaway PostgreSQL + S3 containers
// and a stub for the Brønnøysund registry, runs the backend against them, and tears everything down on SIGTERM.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import { backendPort, databaseStateFile, frontendUrl, jwtSecret } from './stack';

const backendRoot = path.resolve(process.env.E2E_BACKEND_ROOT ?? path.join(process.cwd(), '..', 'pitell'));

if (process.platform === 'darwin' && !process.env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE) {
  process.env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE = '/var/run/docker.sock';
}

const company = {
  organisasjonsnummer: '927491745',
  navn: 'Fredrikstad Barbershop Bahar',
  organisasjonsform: { kode: 'ENK', beskrivelse: 'Enkeltpersonforetak' },
  forretningsadresse: {
    kommune: 'FREDRIKSTAD',
    landkode: 'NO',
    postnummer: '1608',
    adresse: ['Brogata 12'],
    land: 'Norge',
    kommunenummer: '3107',
    poststed: 'FREDRIKSTAD',
  },
};

const brreg = createServer((request, response) => {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1');
  response.setHeader('Content-Type', 'application/json');

  if (url.pathname === `/enheter/${company.organisasjonsnummer}`) {
    response.writeHead(200).end(JSON.stringify(company));
    return;
  }

  if (url.pathname === '/enheter') {
    const requested = new Set((url.searchParams.get('organisasjonsnummer') ?? '').split(','));
    const companies = requested.has(company.organisasjonsnummer) ? [company] : [];
    response.writeHead(200).end(
      JSON.stringify({
        _embedded: { enheter: companies },
        page: { size: companies.length, totalElements: companies.length, totalPages: 1, number: 0 },
      }),
    );
    return;
  }

  response.writeHead(404).end(JSON.stringify({ message: 'Not found' }));
});
await new Promise<void>((resolve) => brreg.listen(0, '127.0.0.1', resolve));
const brregPort = (brreg.address() as { port: number }).port;

const [postgres, storage] = await Promise.all([
  new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('pitell_e2e')
    .withUsername('pitell_e2e')
    .withPassword('pitell_e2e')
    .withStartupTimeout(120_000)
    .start(),
  new GenericContainer('adobe/s3mock:5.2.3')
    .withExposedPorts(9090)
    .withWaitStrategy(Wait.forHttp('/favicon.ico', 9090).forStatusCode(200))
    .withStartupTimeout(120_000)
    .start(),
]);

await mkdir(path.dirname(databaseStateFile), { recursive: true });
await writeFile(databaseStateFile, JSON.stringify({ databaseUrl: postgres.getConnectionUri() }));

const backend = spawn('./gradlew', [':src:app:bootRun'], {
  cwd: backendRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: String(backendPort),
    DATABASE_HOST: postgres.getHost(),
    DATABASE_PORT: String(postgres.getPort()),
    DATABASE_NAME: postgres.getDatabase(),
    DATABASE_USER: postgres.getUsername(),
    DATABASE_PASSWORD: postgres.getPassword(),
    STORAGE_S3_ENDPOINT: `http://${storage.getHost()}:${storage.getMappedPort(9090)}`,
    STORAGE_S3_BUCKET: 'pitell-e2e',
    STORAGE_S3_ACCESS_KEY: 'pitell-e2e',
    STORAGE_S3_SECRET_KEY: 'pitell-e2e-secret',
    STORAGE_S3_REGION: 'eu-north-1',
    BRREG_BASE_URL: `http://127.0.0.1:${brregPort}`,
    // Marketing sends as a dry run outside production. One message per channel per second keeps a 30-recipient
    // campaign "sending" for half a minute, so the cancel journey has time to act; small campaigns finish in seconds.
    MARKETING_WORKER_TICK_MS: '1000',
    MARKETING_WORKER_BATCH_SIZE: '1',
    AUTH_ACCESS_TOKEN_SECRET: jwtSecret,
    pitell_PORTAL_BASE_URL: frontendUrl,
    SPRING_PROFILES_ACTIVE: 'default',
    SPRING_FLYWAY_LOCATIONS: 'classpath:db/migration-monolith',
  },
});

let stopping = false;
async function stop(exitCode: number) {
  if (stopping) return;
  stopping = true;
  if (backend.exitCode === null) backend.kill('SIGTERM');
  brreg.close();
  await Promise.allSettled([postgres.stop(), storage.stop()]);
  process.exit(exitCode);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => void stop(0));
}
backend.once('exit', (code) => void stop(code ?? 1));
