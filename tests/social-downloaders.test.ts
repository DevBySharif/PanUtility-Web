import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../api/index.js';
import { validatePlatformUrl, detectPlatform } from '../lib/providers/platforms.js';
import { CobaltProvider } from '../lib/providers/cobalt.js';
import type { AppConfig } from '../lib/config.js';

const TEST_CONFIG: AppConfig = {
  environment: 'test',
  vercel: false,
  transcriptionEnabled: false,
  allowedOrigins: new Set(['https://omnitily.vercel.app']),
  cobaltApiUrl: 'http://localhost:9000',
  cobaltApiKey: 'test-api-key',
};
const testApp = () => createApp({ config: TEST_CONFIG });

describe('platform URL validation', () => {
  describe('youtube', () => {
    it('accepts valid youtube.com watch URL', () => {
      const r = validatePlatformUrl('youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(r.valid).toBe(true);
      expect(r.platform).toBe('youtube');
    });
    it('accepts valid youtu.be short URL', () => {
      expect(validatePlatformUrl('youtube', 'https://youtu.be/dQw4w9WgXcQ').valid).toBe(true);
    });
    it('accepts youtube.com/shorts/', () => {
      expect(validatePlatformUrl('youtube', 'https://youtube.com/shorts/abc123').valid).toBe(true);
    });
    it('accepts music.youtube.com', () => {
      expect(validatePlatformUrl('youtube', 'https://music.youtube.com/watch?v=abc').valid).toBe(true);
    });
    it('rejects non-youtube URL', () => {
      const r = validatePlatformUrl('youtube', 'https://vimeo.com/12345');
      expect(r.valid).toBe(false);
      expect(r.error).toContain('YouTube');
    });
  });

  describe('instagram', () => {
    it('accepts /p/ post URL', () => {
      expect(validatePlatformUrl('instagram', 'https://www.instagram.com/p/CxYzAbCdEfG/').valid).toBe(true);
    });
    it('accepts /reel/ URL', () => {
      expect(validatePlatformUrl('instagram', 'https://instagram.com/reel/ABC123/').valid).toBe(true);
    });
    it('accepts /reels/ URL', () => {
      expect(validatePlatformUrl('instagram', 'https://www.instagram.com/reels/DEF456/').valid).toBe(true);
    });
    it('rejects non-instagram URL', () => {
      expect(validatePlatformUrl('instagram', 'https://tiktok.com/@user/video/123').valid).toBe(false);
    });
    it('rejects instagram.com without valid path', () => {
      expect(validatePlatformUrl('instagram', 'https://www.instagram.com/').valid).toBe(false);
    });
  });

  describe('tiktok', () => {
    it('accepts standard tiktok.com URL', () => {
      expect(validatePlatformUrl('tiktok', 'https://www.tiktok.com/@user/video/1234567890').valid).toBe(true);
    });
    it('accepts vm.tiktok.com short URL', () => {
      expect(validatePlatformUrl('tiktok', 'https://vm.tiktok.com/abc123/').valid).toBe(true);
    });
    it('accepts vt.tiktok.com short URL', () => {
      expect(validatePlatformUrl('tiktok', 'https://vt.tiktok.com/xyz789/').valid).toBe(true);
    });
    it('rejects non-tiktok URL', () => {
      expect(validatePlatformUrl('tiktok', 'https://youtube.com/watch?v=abc').valid).toBe(false);
    });
  });

  describe('facebook', () => {
    it('accepts facebook.com/watch URL', () => {
      expect(validatePlatformUrl('facebook', 'https://www.facebook.com/watch?v=123456').valid).toBe(true);
    });
    it('accepts fb.watch short URL', () => {
      expect(validatePlatformUrl('facebook', 'https://fb.watch/abc123/').valid).toBe(true);
    });
    it('accepts facebook.com/reel/ URL', () => {
      expect(validatePlatformUrl('facebook', 'https://facebook.com/reel/123456').valid).toBe(true);
    });
    it('rejects non-facebook URL', () => {
      expect(validatePlatformUrl('facebook', 'https://youtube.com/watch?v=abc').valid).toBe(false);
    });
  });

  describe('common validations', () => {
    it('rejects empty URL', () => {
      expect(validatePlatformUrl('youtube', '').valid).toBe(false);
    });
    it('rejects non-URL text', () => {
      expect(validatePlatformUrl('youtube', 'not a url').valid).toBe(false);
    });
    it('rejects HTTP URLs', () => {
      expect(validatePlatformUrl('youtube', 'http://youtube.com/watch?v=abc').valid).toBe(false);
    });
    it('rejects URLs with token query params', () => {
      expect(validatePlatformUrl('youtube', 'https://youtube.com/watch?v=abc&access_token=xyz').valid).toBe(false);
    });
    it('rejects URLs with auth query params', () => {
      expect(validatePlatformUrl('youtube', 'https://youtube.com/watch?v=abc&session=abc123').valid).toBe(false);
    });
  });
});

describe('detectPlatform', () => {
  it('detects youtube', () => {
    expect(detectPlatform('https://youtube.com/watch?v=abc')).toBe('youtube');
    expect(detectPlatform('https://youtu.be/abc')).toBe('youtube');
  });
  it('detects instagram', () => {
    expect(detectPlatform('https://instagram.com/p/abc')).toBe('instagram');
  });
  it('detects tiktok', () => {
    expect(detectPlatform('https://tiktok.com/@user/video/123')).toBe('tiktok');
    expect(detectPlatform('https://vm.tiktok.com/abc')).toBe('tiktok');
  });
  it('detects facebook', () => {
    expect(detectPlatform('https://facebook.com/watch?v=123')).toBe('facebook');
    expect(detectPlatform('https://fb.watch/abc')).toBe('facebook');
  });
  it('returns null for unknown', () => {
    expect(detectPlatform('https://vimeo.com/123')).toBeNull();
  });
  it('returns null for non-URL', () => {
    expect(detectPlatform('not a url')).toBeNull();
  });
});

describe('CobaltProvider', () => {
  it('reports not configured when no URL', () => {
    const p = new CobaltProvider('');
    expect(p.isConfigured()).toBe(false);
  });
  it('reports configured when URL is set', () => {
    const p = new CobaltProvider('http://localhost:9000');
    expect(p.isConfigured()).toBe(true);
  });
});

describe('download API endpoints', () => {
  it('POST /api/download/youtube requires JSON content type', async () => {
    const res = await request(testApp()).post('/api/download/youtube').send('hello');
    expect(res.status).toBe(415);
  });

  it('POST /api/download/youtube requires url field', async () => {
    const res = await request(testApp()).post('/api/download/youtube').set('Content-Type', 'application/json').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('POST /api/download/youtube rejects unsupported fields', async () => {
    const res = await request(testApp()).post('/api/download/youtube').set('Content-Type', 'application/json').send({ url: 'https://youtube.com/watch?v=abc', evil: true });
    expect(res.status).toBe(400);
  });

  it('POST /api/download/youtube rejects invalid URL format', async () => {
    const res = await request(testApp()).post('/api/download/youtube').set('Content-Type', 'application/json').send({ url: 'not-a-url' });
    expect(res.status).toBe(400);
  });

  it('POST /api/download/youtube rejects wrong platform URL', async () => {
    const res = await request(testApp()).post('/api/download/youtube').set('Content-Type', 'application/json').send({ url: 'https://tiktok.com/@user/video/123' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('YouTube');
  });

  it('POST /api/download/youtube rejects GET method', async () => {
    const res = await request(testApp()).get('/api/download/youtube');
    expect(res.status).toBe(405);
  });

  it('POST /api/download/youtube rejects PUT method', async () => {
    const res = await request(testApp()).put('/api/download/youtube').set('Content-Type', 'application/json').send({ url: 'https://youtube.com/watch?v=abc' });
    expect(res.status).toBe(405);
  });

  it('POST /api/download/instagram rejects wrong platform', async () => {
    const res = await request(testApp()).post('/api/download/instagram').set('Content-Type', 'application/json').send({ url: 'https://youtube.com/watch?v=abc' });
    expect(res.status).toBe(400);
  });

  it('POST /api/download/tiktok rejects wrong platform', async () => {
    const res = await request(testApp()).post('/api/download/tiktok').set('Content-Type', 'application/json').send({ url: 'https://facebook.com/watch?v=123' });
    expect(res.status).toBe(400);
  });

  it('POST /api/download/facebook rejects wrong platform', async () => {
    const res = await request(testApp()).post('/api/download/facebook').set('Content-Type', 'application/json').send({ url: 'https://instagram.com/p/abc' });
    expect(res.status).toBe(400);
  });

  it('POST /api/download/youtube accepts valid youtube URL', async () => {
    const res = await request(testApp()).post('/api/download/youtube').set('Content-Type', 'application/json').send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect([502, 504, 503]).toContain(res.status);
  });

  it('POST /api/download/youtube works without API key configured', async () => {
    const noKeyConfig = { ...TEST_CONFIG, cobaltApiKey: undefined };
    const app = createApp({ config: noKeyConfig });
    const res = await request(app).post('/api/download/youtube').set('Content-Type', 'application/json').send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect([502, 504, 503]).toContain(res.status);
  });

  it('POST /api/download/youtube returns 503 when Cobalt not configured', async () => {
    const noCobaltConfig = { ...TEST_CONFIG, cobaltApiUrl: undefined };
    const app = createApp({ config: noCobaltConfig });
    const res = await request(app).post('/api/download/youtube').set('Content-Type', 'application/json').send({ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
  });
});
