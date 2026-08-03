import { describe, expect, it } from 'vitest';
import { loadConfig, requireProductionLimiter } from '../api/config';
import { clientIp, hashIdentity, normalizeIp } from '../api/security/clientIdentity';

const production = { NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'production', GEMINI_API_KEY: 'key', ALLOWED_ORIGINS: 'https://panutility.vercel.app', UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'token', RATE_LIMIT_IDENTITY_SECRET: 'x'.repeat(32) };

describe('production environment schema', () => {
  it('accepts valid production and development defaults without exposing secrets', () => {
    const config = loadConfig(production); expect(config.environment).toBe('production'); expect(config.allowedOrigins.has('https://panutility.vercel.app')).toBe(true);
    expect(loadConfig({ NODE_ENV: 'development' }).allowedOrigins.has('http://localhost:3000')).toBe(true);
    expect(loadConfig({ NODE_ENV: 'test' }).environment).toBe('test');
  });
  it.each([
    [{ ...production, ALLOWED_ORIGINS: 'not-url' }],
    [{ ...production, ALLOWED_ORIGINS: 'https://panutility.vercel.app/' }],
    [{ ...production, ALLOWED_ORIGINS: 'http://panutility.vercel.app' }],
    [{ ...production, RATE_LIMIT_IDENTITY_SECRET: 'short' }],
    [{ ...production, UPSTASH_REDIS_REST_TOKEN: '' }],
    [{ ...production, NODE_ENV: 'staging' }],
    [{ ...production, VERCEL_ENV: 'staging' }],
  ])('rejects malformed production configuration %#', (env) => expect(() => loadConfig(env)).toThrow());
  it('allows missing Gemini configuration but fails closed when production limiter configuration is missing', () => {
    const config = loadConfig({ NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://panutility.vercel.app' });
    expect(config.geminiApiKey).toBeUndefined(); expect(() => requireProductionLimiter(config)).toThrowError(expect.objectContaining({ status: 503 }));
  });
});

describe('client identity policy', () => {
  const request = (headers: Record<string,string>, remoteAddress = '127.0.0.1') => ({ get: (name: string) => headers[name.toLowerCase()], socket: { remoteAddress } }) as never;
  it('uses only Vercel-overwritten identity in production and ignores spoofed XFF locally', () => {
    expect(clientIp(request({ 'x-vercel-forwarded-for': '203.0.113.5', 'x-forwarded-for': '10.0.0.1' }), true)).toBe('203.0.113.5');
    expect(clientIp(request({ 'x-forwarded-for': '8.8.8.8' }, '127.0.0.1'), false)).toBe('127.0.0.1');
  });
  it('rejects multiple/malformed values and normalizes IPv4-mapped IPv6', () => {
    expect(() => clientIp(request({ 'x-vercel-forwarded-for': '8.8.8.8, 1.1.1.1' }), true)).toThrow();
    expect(() => normalizeIp('garbage')).toThrow(); expect(normalizeIp('::ffff:192.0.2.1')).toBe('192.0.2.1');
  });
  it('hashes identities without retaining raw IP or exposing the secret', () => {
    const hash = hashIdentity('203.0.113.5', 'x'.repeat(32)); expect(hash).not.toContain('203.0.113.5'); expect(hash).not.toContain('xxx'); expect(hashIdentity('203.0.113.5', 'x'.repeat(32))).toBe(hash);
  });
});
