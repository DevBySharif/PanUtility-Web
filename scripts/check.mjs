import { spawnSync } from 'node:child_process';
import process from 'node:process';

const commands = [
  ['node_modules/typescript/bin/tsc', '--noEmit'],
  ['node_modules/eslint/bin/eslint.js', 'src', 'api', 'server.ts', 'vite.config.ts', 'vitest.config.ts', 'playwright.config.ts', 'tests'],
  ['node_modules/vitest/vitest.mjs', 'run'],
  ['scripts/build.mjs'],
];

for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
