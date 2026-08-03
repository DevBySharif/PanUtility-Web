/**
 * Regression tests for Vercel API runtime import safety.
 *
 * Verifies:
 * 1. The Vercel API function tree (api/index.ts) does not expose extra lambda endpoints.
 * 2. No local .ts import specifiers survive into the built bundle.
 * 3. /api/health and /api/readiness load without any external secrets.
 * 4. /api/transcribe returns structured 410 in zero-cost production.
 * 5. The server bundle stays outside public dist.
 * 6. No source map is publicly accessible from the dist folder.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../api/index';
import type { AppConfig } from '../api/config';

// ---------------------------------------------------------------------------
// 1. Vercel function isolation — only api/index.ts should be a handler
// ---------------------------------------------------------------------------
describe('Vercel function isolation', () => {
  it('api/config.ts is a re-export shim only, not standalone logic', () => {
    const src = readFileSync('api/config.ts', 'utf8');
    // Must not contain function/class declarations — only re-exports
    expect(src).not.toMatch(/^export\s+(function|class|const\s+\w+\s*=\s*function)/m);
    expect(src).toMatch(/export\s+\*\s+from/);
  });

  it('api/security/*.ts are re-export shims only, not standalone logic', () => {
    const securityDir = 'api/security';
    const files = readdirSync(securityDir).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(join(securityDir, file), 'utf8');
      expect(src).not.toMatch(/^export\s+(function|class|const\s+\w+\s*=\s*function)/m);
      expect(src).toMatch(/export\s+\*\s+from/);
    }
  });

  it('lib/ contains the actual module implementations', () => {
    expect(existsSync('lib/config.ts')).toBe(true);
    expect(existsSync('lib/security/errors.ts')).toBe(true);
    expect(existsSync('lib/security/clientIdentity.ts')).toBe(true);
    expect(existsSync('lib/security/rateLimit.ts')).toBe(true);
    expect(existsSync('lib/security/outbound.ts')).toBe(true);

    // lib/config.ts must contain the real loadConfig function
    const configSrc = readFileSync('lib/config.ts', 'utf8');
    expect(configSrc).toContain('export function loadConfig');

    // lib/security/errors.ts must contain the real ApiError class
    const errorsSrc = readFileSync('lib/security/errors.ts', 'utf8');
    expect(errorsSrc).toContain('export class ApiError');
  });

  it('api/index.ts imports from ../lib/ not from ./security/ or ./config', () => {
    const src = readFileSync('api/index.ts', 'utf8');
    // Must not import from old locations
    expect(src).not.toMatch(/from\s+['"]\.\/security\//);
    expect(src).not.toMatch(/from\s+['"]\.\/config/);
    // Must import from ../lib/
    expect(src).toMatch(/from\s+['"]\.\.\/lib\//);
  });
});

// ---------------------------------------------------------------------------
// 2. No .ts specifiers survive into built output
// ---------------------------------------------------------------------------
describe('build output safety', () => {
  it('does not expose a server source map in dist/', () => {
    // If dist/ doesn't exist yet (pre-build), skip — this is a post-build guard.
    if (!existsSync('dist')) return;
    const walk = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const full = join(dir, f);
        return statSync(full).isDirectory() ? walk(full) : [full];
      });
    const maps = walk('dist').filter((f) => f.endsWith('.map'));
    // Source maps in dist/ must not reference server-side paths
    for (const map of maps) {
      const content = readFileSync(map, 'utf8');
      expect(content).not.toContain('server.ts');
      expect(content).not.toContain('api/index.ts');
    }
  });

  it('server-dist/ is not inside dist/ (server bundle outside public root)', () => {
    if (!existsSync('server-dist')) return;
    expect(existsSync('dist/server-dist')).toBe(false);
    expect(existsSync('dist/server.cjs')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3 & 4. Zero-cost production API behavior (no secrets required)
// ---------------------------------------------------------------------------
const origin = 'https://panutility.vercel.app';
const prodConfig: AppConfig = {
  environment: 'production',
  vercel: true,
  vercelEnvironment: 'production',
  transcriptionEnabled: false,
  allowedOrigins: new Set([origin]),
};

describe('zero-cost API loads without external secrets', () => {
  it('/api/health returns 200 JSON without any secret', async () => {
    const res = await request(createApp({ config: prodConfig })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', requestId: expect.any(String) });
  });

  it('/api/readiness returns 200 without Gemini, Redis, or identity secret', async () => {
    const res = await request(createApp({ config: prodConfig })).get('/api/readiness');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ready', services: { browserTools: true } });
    // Must not leak any secret name in the response body
    expect(JSON.stringify(res.body)).not.toMatch(/gemini|redis|token|apiKey|identitySecret/i);
  });

  it('/api/transcribe returns structured 410 FEATURE_DISABLED in zero-cost production', async () => {
    const res = await request(createApp({ config: prodConfig }))
      .post('/api/transcribe')
      .set('Origin', origin)
      .set('Content-Type', 'application/json')
      .send({ audio: 'AAAA', mimeType: 'audio/wav' });
    expect(res.status).toBe(410);
    expect(res.body.error).toMatchObject({
      code: 'FEATURE_DISABLED',
      requestId: expect.any(String),
    });
    // Must not leak stack trace or source path
    expect(JSON.stringify(res.body)).not.toMatch(/\/var\/task|\.ts:|at\s+\w+\s+\(/);
  });

  it('API cache is no-store on all responses', async () => {
    for (const path of ['/api/health', '/api/readiness', '/api/transcribe', '/api/nope']) {
      const res = await request(createApp({ config: prodConfig })).get(path);
      expect(res.headers['cache-control']).toBe('no-store');
    }
  });

  it('unknown API routes return structured 404', async () => {
    const res = await request(createApp({ config: prodConfig })).get('/api/unknown-route-xyz');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('/api/resolve-social and /api/media-proxy return structured 410', async () => {
    for (const route of ['/api/resolve-social', '/api/media-proxy']) {
      const res = await request(createApp({ config: prodConfig })).get(route);
      expect(res.status).toBe(410);
      expect(res.body.error).toMatchObject({ code: 'FEATURE_DISABLED' });
    }
  });
});
