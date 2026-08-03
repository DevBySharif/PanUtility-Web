import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../api/index';
import { MemoryRateLimitStore, type RateLimitStore } from '../api/security/rateLimit';
import type { AppConfig } from '../api/config';

const origin = 'https://panutility.vercel.app';
const config: AppConfig = { environment: 'production', vercel: true, vercelEnvironment: 'production', geminiApiKey: 'configured', allowedOrigins: new Set([origin]), redisUrl: 'https://redis.example', redisToken: 'configured', identitySecret: 'x'.repeat(32) };
const readyStore: RateLimitStore = { increment: async () => ({ count: 1, resetAt: Date.now() + 1000 }), ready: async () => true };
const app = () => createApp({ config, rateLimitStore: readyStore, generateContent: async () => 'ok' });

describe('production deployment API behavior', () => {
  it('has safe health and readiness without paid provider calls', async () => {
    const health = await request(app()).get('/api/health'); expect(health.status).toBe(200); expect(health.body).toMatchObject({ status: 'ok', requestId: expect.any(String) });
    const readiness = await request(app()).get('/api/readiness'); expect(readiness.status).toBe(200); expect(readiness.body).toMatchObject({ status: 'ready', services: { transcription: true, rateLimit: true } });
    expect(JSON.stringify(readiness.body)).not.toMatch(/token|redis\.example|configured|apiKey/i);
  });
  it('reports not-ready without revealing missing configuration', async () => {
    const response = await request(createApp({ config: { ...config, geminiApiKey: undefined }, rateLimitStore: { ...readyStore, ready: async () => false } })).get('/api/readiness');
    expect(response.status).toBe(503); expect(response.body.status).toBe('not-ready'); expect(JSON.stringify(response.body)).not.toMatch(/secret|url|token/i);
  });
  it('applies headers to health, errors, and disabled endpoints', async () => {
    for (const path of ['/api/health', '/api/nope', '/api/media-proxy']) {
      const response = await request(app()).get(path);
      expect(response.headers['cache-control']).toBe('no-store'); expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toContain('max-age='); expect(response.headers['content-security-policy']).toContain("default-src 'none'");
      expect(response.headers['content-security-policy']).not.toContain('unsafe-eval'); expect(response.headers['x-request-id']).toBeTruthy();
    }
  });
  it.each([
    [origin, 200, origin],
    ['https://panutility.vercel.app.evil.example', 403, undefined],
    ['https://random-preview.vercel.app', 403, undefined],
    ['null', 403, undefined],
    ['https://panutility.vercel.app.', 403, undefined],
    ['https://panutility.vercel.app:444', 403, undefined],
    ['http://panutility.vercel.app', 403, undefined],
  ])('enforces exact origin %s', async (candidate, status, reflected) => {
    const response = await request(app()).get('/api/health').set('Origin', candidate);
    expect(response.status).toBe(status); expect(response.headers['access-control-allow-origin']).toBe(reflected);
    expect(response.headers.vary).toContain('Origin');
  });
  it('rejects missing transcription origin in production and allows local defaults outside production', async () => {
    const audio = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(40)]).toString('base64');
    expect((await request(app()).post('/api/transcribe').set('Content-Type', 'application/json').set('x-vercel-forwarded-for', '8.8.8.8').send({ audio, mimeType: 'audio/wav' })).status).toBe(403);
    const local = createApp({ config: { ...config, environment: 'development', vercel: false, redisUrl: undefined, redisToken: undefined, identitySecret: undefined }, rateLimitStore: new MemoryRateLimitStore(), generateContent: async () => 'ok' });
    expect((await request(local).get('/api/health').set('Origin', origin)).status).toBe(200);
  });
  it('fails transcription closed when production shared limiter is missing', async () => {
    const audio = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(40)]).toString('base64');
    const unsafeConfig = { ...config, redisUrl: undefined, redisToken: undefined, identitySecret: undefined };
    const response = await request(createApp({ config: unsafeConfig, rateLimitStore: new MemoryRateLimitStore(), generateContent: async () => 'ok' })).post('/api/transcribe').set('Origin', origin).set('Content-Type', 'application/json').set('x-vercel-forwarded-for', '8.8.8.8').send({ audio, mimeType: 'audio/wav' });
    expect(response.status).toBe(503); expect(response.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
