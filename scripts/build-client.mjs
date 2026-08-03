import { spawnSync } from 'node:child_process';
import process from 'node:process';

const commands = [
  ['--experimental-strip-types', 'scripts/generate-sitemap.ts'],
  ['node_modules/vite/bin/vite.js', 'build'],
  ['--experimental-strip-types', 'scripts/prerender.ts'],
];

for (const args of commands) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
