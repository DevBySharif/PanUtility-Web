import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../api/index';
import type { AppConfig } from '../lib/config';

const origin = 'https://omnitily.vercel.app';
const config: AppConfig = { environment: 'production', vercel: true, vercelEnvironment: 'production', transcriptionEnabled: false, allowedOrigins: new Set([origin]) };
const app = () => createApp({ config });

describe('zero-cost production API behavior', () => {
  it('has healthy readiness without provider or rate-limit configuration', async () => {
    const health = await request(app()).get('/api/health');
    expect(health.status).toBe(200); expect(health.body).toMatchObject({ status: 'ok', requestId: expect.any(String) });
    const readiness = await request(app()).get('/api/readiness');
    expect(readiness.status).toBe(200); expect(readiness.body).toMatchObject({ status: 'ready', services: { browserTools: true }, requestId: expect.any(String) });
    expect(JSON.stringify(readiness.body)).not.toMatch(/token|redis|gemini|apiKey/i);
  });

  it('disables transcription before provider or limiter initialization', async () => {
    const provider = vi.fn(async () => 'should not run');
    const response = await request(createApp({ config, generateContent: provider })).post('/api/transcribe').set('Origin', origin).set('Content-Type', 'application/json').send({ audio: 'payload', mimeType: 'audio/wav' });
    expect(response.status).toBe(410); expect(response.body.error).toMatchObject({ code: 'FEATURE_DISABLED', requestId: expect.any(String) }); expect(provider).not.toHaveBeenCalled();
  });

  it('applies headers to health, errors, and disabled endpoints', async () => {
    for (const path of ['/api/health', '/api/nope', '/api/transcribe']) {
      const response = await request(app()).get(path);
      expect(response.headers['cache-control']).toBe('no-store'); expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['strict-transport-security']).toContain('max-age='); expect(response.headers['content-security-policy']).toContain("default-src 'none'");
      expect(response.headers['content-security-policy']).not.toContain('unsafe-eval'); expect(response.headers['x-request-id']).toBeTruthy();
    }
  });

  it.each([
    [origin, 200, origin],
    ['https://omnitily.vercel.app.evil.example', 403, undefined],
    ['https://random-preview.vercel.app', 403, undefined],
    ['null', 403, undefined],
    ['https://omnitily.vercel.app.', 403, undefined],
    ['https://omnitily.vercel.app:444', 403, undefined],
    ['http://omnitily.vercel.app', 403, undefined],
  ])('enforces exact origin %s', async (candidate, status, reflected) => {
    const response = await request(app()).get('/api/health').set('Origin', candidate);
    expect(response.status).toBe(status); expect(response.headers['access-control-allow-origin']).toBe(reflected); expect(response.headers.vary).toContain('Origin');
  });
});
