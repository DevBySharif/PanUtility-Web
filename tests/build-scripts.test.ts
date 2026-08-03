import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8').replace(/\\/g, '/');

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
const buildScript = read('scripts/build.mjs');
const buildServerScript = read('scripts/build-server.mjs');
const buildClientScript = read('scripts/build-client.mjs');
const launcherSources = [
  packageJson.scripts.build,
  packageJson.scripts['build:server'],
  buildScript,
  buildServerScript,
  buildClientScript,
].join('\n');

describe('cross-platform production build scripts', () => {
  it('does not pass the native esbuild binary to Node', () => {
    expect(launcherSources).not.toMatch(/\bnode(?:\.cmd)?\s+['"]?node_modules\/esbuild\/bin\/esbuild\b/i);
    expect(launcherSources).not.toMatch(/process\.execPath[\s\S]{0,400}node_modules\/esbuild\/bin\/esbuild/i);
    expect(launcherSources).not.toMatch(/(?:esbuild\.cmd|esbuild\.exe)\b/i);
    expect(launcherSources).not.toMatch(/(?:import|require)[\s\S]{0,120}node_modules\/esbuild\/bin\/esbuild/i);
  });

  it('uses the esbuild JavaScript API with the existing server bundle contract', () => {
    expect(packageJson.scripts['build:server']).toBe('node scripts/build-server.mjs');
    expect(buildScript).toContain("['scripts/build-server.mjs']");
    expect(buildServerScript).toContain("import { build } from 'esbuild'");
    expect(buildServerScript).toContain("entryPoints: ['server.ts']");
    expect(buildServerScript).toContain('bundle: true');
    expect(buildServerScript).toContain("platform: 'node'");
    expect(buildServerScript).toContain("format: 'cjs'");
    expect(buildServerScript).toContain("packages: 'external'");
    expect(buildServerScript).toContain('sourcemap: true');
    expect(buildServerScript).toContain("outfile: 'server-dist/server.cjs'");
  });

  it('keeps the server bundle outside the public client dist directory', () => {
    const outfile = buildServerScript.match(/outfile:\s*['"]([^'"]+)['"]/)?.[1];
    expect(outfile).toBe('server-dist/server.cjs');
    expect(outfile?.startsWith('dist/')).toBe(false);
  });
});
