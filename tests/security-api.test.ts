import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../api/index';
import { redact } from '../lib/security/errors';
import type { AppConfig } from '../lib/config';

const origin = 'http://localhost:3000';
const wav = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(40)]).toString('base64');
const devConfig: AppConfig = { environment: 'development', vercel: false, transcriptionEnabled: true, geminiApiKey: 'test-key', allowedOrigins: new Set([origin]) };
const testApp = (options: Parameters<typeof createApp>[0] = {}) => createApp({ config: devConfig, ...options });
const post = (app = testApp({ generateContent: async () => '[00:00] Hello' })) => request(app).post('/api/transcribe').set('Origin', origin).set('Content-Type', 'application/json');

afterEach(() => { delete process.env.GEMINI_API_KEY; vi.restoreAllMocks(); });

describe('transcription security', () => {
  it('accepts a valid mocked response without a live provider', async () => {
    const response = await post().send({ audio: wav, mimeType: 'audio/wav' });
    expect(response.status).toBe(200); expect(response.body.transcription).toBe('[00:00] Hello'); expect(response.body.requestId).toBeTruthy();
  });
  it.each([
    [{ audio: '%%%=', mimeType: 'audio/wav' }, 400],
    [{ audio: '', mimeType: 'audio/wav' }, 400],
    [{ audio: Buffer.from('text').toString('base64'), mimeType: 'text/plain' }, 415],
    [{ audio: Buffer.from('text').toString('base64'), mimeType: 'audio/wav' }, 415],
    [{ audio: wav, mimeType: 'audio/wav', fileUrl: 'https://example.com/a' }, 400],
  ])('rejects invalid audio schema %#', async (body, status) => expect((await post().send(body)).status).toBe(status));
  it('rejects oversized decoded audio', async () => {
    const audio = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(3 * 1024 * 1024)]).toString('base64');
    expect((await post().send({ audio, mimeType: 'audio/wav' })).status).toBe(413);
  });
  it('handles missing key, timeout, and provider failures safely', async () => {
    const missing = await request(testApp({ config: { ...devConfig, geminiApiKey: undefined } })).post('/api/transcribe').set('Origin', origin).set('Content-Type', 'application/json').send({ audio: wav, mimeType: 'audio/wav' });
    expect(missing.status).toBe(503);
    const timeout = await post(testApp({ generateContent: () => new Promise(() => {}), providerTimeoutMs: 5 })).send({ audio: wav, mimeType: 'audio/wav' });
    expect(timeout.status).toBe(504); expect(JSON.stringify(timeout.body)).not.toContain('stack');
    const failed = await post(testApp({ generateContent: async () => { throw new Error('secret provider stack'); } })).send({ audio: wav, mimeType: 'audio/wav' });
    expect(failed.status).toBe(502); expect(JSON.stringify(failed.body)).not.toContain('secret provider stack');
  });
  it('enforces endpoint rate limits and Retry-After', async () => {
    const app = testApp({ generateContent: async () => 'ok' });
    for (let i = 0; i < 5; i++) expect((await post(app).send({ audio: wav, mimeType: 'audio/wav' })).status).toBe(200);
    const blocked = await post(app).send({ audio: wav, mimeType: 'audio/wav' });
    expect(blocked.status).toBe(429); expect(blocked.headers['retry-after']).toBeTruthy();
  });
});

describe('API policy and retired endpoints', () => {
  it('returns 405, rejects content type and malformed JSON', async () => {
    expect((await request(testApp()).get('/api/transcribe').set('Origin', origin)).status).toBe(405);
    expect((await request(testApp()).post('/api/transcribe').set('Origin', origin).set('Content-Type', 'text/plain').send('x')).status).toBe(415);
    expect((await request(testApp()).post('/api/transcribe').set('Origin', origin).set('Content-Type', 'application/json').send('{')).status).toBe(400);
  });
  it('accepts configured origin, rejects unknown origin, and never reflects it', async () => {
    expect((await post().send({ audio: wav, mimeType: 'audio/wav' })).headers['access-control-allow-origin']).toBe(origin);
    const denied = await request(testApp()).post('/api/transcribe').set('Origin', 'https://evil.example').set('Content-Type', 'application/json').send({ audio: wav, mimeType: 'audio/wav' });
    expect(denied.status).toBe(403); expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('disables resolver and proxy for every method and rejects unsigned URLs', async () => {
    for (const path of ['/api/resolve-social', '/api/media-proxy?url=https://example.com/a']) {
      const response = await request(testApp()).get(path).set('Origin', origin);
      expect(response.status).toBe(410); expect(response.body.error.code).toBe('FEATURE_DISABLED');
    }
  });
  it('uses structured safe errors and request IDs', async () => {
    const response = await request(testApp()).get('/api/nope').set('Origin', origin);
    expect(response.body).toEqual({ error: { code: 'NOT_FOUND', message: 'API route not found.', requestId: expect.any(String) } });
    expect(JSON.stringify(response.body)).not.toMatch(/stack|filesystem|GEMINI/i);
  });
  it('redacts secrets, URLs, and long payloads', () => {
    const result = redact(`authorization=secret cookie=abc token=xyz https://private.example/path ${'A'.repeat(100)}`);
    expect(result).not.toMatch(/secret|abc|xyz|private\.example|A{80}/);
  });
});
