import { spawnSync } from 'node:child_process';
import process from 'node:process';

const commands = [
  ['scripts/build-client.mjs'],
  ['scripts/build-server.mjs'],
];

for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
