import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';

/**
 * Testcontainers only checks DOCKER_HOST and the default socket paths. With Colima, OrbStack or Rancher the `docker`
 * command works through a "context" instead, so Testcontainers reports "Could not find a working container runtime
 * strategy". When nothing is configured, ask the docker CLI where its socket is and use that.
 */
export function ensureDockerHost() {
  if (process.env.DOCKER_HOST) return;
  if ([`/var/run/docker.sock`, `${homedir()}/.docker/run/docker.sock`].some((socket) => existsSync(socket))) return;

  try {
    const host = execFileSync('docker', ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!host) return;
    process.env.DOCKER_HOST = host;
    // Inside the Colima VM the socket lives at the default path, which is where containers must mount it from.
    if (host.includes('colima')) {
      process.env.TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE ??= '/var/run/docker.sock';
    }
  } catch {
    // No docker CLI or no context: leave it to Testcontainers, which reports the problem itself.
  }
}
