import express, { type NextFunction, type Request, type Response } from 'express';
import { execFile } from 'node:child_process';
import { ApiError, errorMiddleware, requestId, sendError } from '../lib/security/errors.js';
import { clientIp, hashIdentity } from '../lib/security/clientIdentity.js';
import { MemoryRateLimitStore, UpstashRateLimitStore, createRateLimitMiddleware, type RateLimitStore } from '../lib/security/rateLimit.js';
import { loadConfig, requireProductionLimiter, type AppConfig } from '../lib/config.js';
import { CobaltProvider } from '../lib/providers/cobalt.js';
import { validatePlatformUrl } from '../lib/providers/platforms.js';
import { validateOutboundUrl } from '../lib/security/outbound.js';
import type { Platform } from '../lib/providers/types.js';

export const AUDIO_MAX_BYTES = 3 * 1024 * 1024;
export const BODY_LIMIT = '4.25mb';
const PROVIDER_TIMEOUT_MS = 20_000;
const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac']);

async function resolveWithYtdlp(targetUrl: string, maxDuration = 600): Promise<{ videoUrl: string; title: string; thumbnail: string; duration: string } | null> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => { try { child.kill(); } catch { /* already exited */ } resolve(null); }, 25_000);
    const child = execFile('yt-dlp', [
      '-j', '--no-download', '--no-update', '--no-warnings',
      '--format', 'best[height<=720][ext=mp4]/best[height<=720]/best[ext=mp4]/best',
      '--no-playlist', '--socket-timeout', '15',
      targetUrl,
    ], { timeout: 20_000, maxBuffer: 5 * 1024 * 1024 }, (err, stdout) => {
      clearTimeout(timeout);
      if (err || !stdout?.trim()) { resolve(null); return; }
      try {
        const info = JSON.parse(stdout.trim().split('\n')[0]) as Record<string, any>;
        const videoUrl = info.url as string;
        if (!videoUrl) { resolve(null); return; }
        const secs = typeof info.duration === 'number' ? Math.floor(info.duration) : 0;
        const duration = secs ? `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}` : '00:00';
        resolve({
          videoUrl,
          title: (info.title as string) || '',
          thumbnail: (info.thumbnail as string) || '',
          duration,
        });
      } catch { resolve(null); }
    });
    child.on('error', () => { clearTimeout(timeout); resolve(null); });
  });
}

function originPolicy(config: AppConfig) { return (req: Request, res: Response, next: NextFunction) => {
  const origin = req.get('origin');
  if (origin) {
    res.setHeader('Vary', 'Origin');
    if (origin === 'null' || !config.allowedOrigins.has(origin)) return next(new ApiError(403, 'INVALID_ORIGIN', 'This origin is not allowed.'));
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (config.transcriptionEnabled && config.environment === 'production' && req.originalUrl.split('?')[0] === '/api/transcribe') {
    return next(new ApiError(403, 'INVALID_ORIGIN', 'This origin is not allowed.'));
  }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Request-ID');
    return res.status(204).end();
  }
  next();
}; }

function decodeAudio(body: unknown): { audio: string; mimeType: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ApiError(400, 'BAD_REQUEST', 'A JSON request body is required.');
  const keys = Object.keys(body);
  if (keys.some((key) => !['audio', 'mimeType'].includes(key))) throw new ApiError(400, 'BAD_REQUEST', 'The request contains unsupported fields.');
  const { audio, mimeType } = body as Record<string, unknown>;
  if (typeof audio !== 'string' || !audio.length || typeof mimeType !== 'string') throw new ApiError(400, 'BAD_REQUEST', 'Audio and mimeType are required.');
  if (!AUDIO_MIME.has(mimeType.toLowerCase())) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'This audio type is not supported.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(audio) || audio.length % 4 !== 0) throw new ApiError(400, 'BAD_REQUEST', 'The audio data is not valid Base64.');
  const bytes = Buffer.from(audio, 'base64');
  if (!bytes.length) throw new ApiError(400, 'BAD_REQUEST', 'Audio cannot be empty.');
  if (bytes.length > AUDIO_MAX_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE', 'Audio exceeds the 3 MiB limit.');
  const signatureOkay = bytes.length >= 4 && (bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff || bytes.subarray(0, 4).toString() === 'RIFF' || bytes.subarray(0, 4).toString() === 'OggS' || bytes.subarray(0, 4).toString('hex') === '1a45dfa3' || bytes.subarray(4, 8).toString() === 'ftyp' || bytes.subarray(0, 4).toString() === 'fLaC');
  if (!signatureOkay) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'The audio signature does not match a supported format.');
  return { audio, mimeType: mimeType.toLowerCase() };
}

export function createApp(options: { generateContent?: (audio: string, mimeType: string) => Promise<string>; providerTimeoutMs?: number; config?: AppConfig; rateLimitStore?: RateLimitStore } = {}) {
  const config = options.config ?? loadConfig();
  const store = config.transcriptionEnabled ? options.rateLimitStore ?? (config.environment === 'production' && config.redisUrl && config.redisToken
    ? new UpstashRateLimitStore(config.redisUrl, config.redisToken)
    : new MemoryRateLimitStore()) : undefined;
  const app = express();
  app.set('trust proxy', false);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    const started = Date.now();
    res.locals.requestId = requestId(req);
    res.setHeader('X-Request-ID', res.locals.requestId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=()');
    if (req.path.startsWith('/api/')) res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (config.environment === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.on('finish', () => console.log(JSON.stringify({ level: 'info', requestId: res.locals.requestId, route: req.path, method: req.method, status: res.statusCode, durationMs: Date.now() - started })));
    next();
  });
  app.use('/api', originPolicy(config));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', requestId: res.locals.requestId }));
  app.get('/api/readiness', async (_req, res) => {
    if (!config.transcriptionEnabled) return res.json({ status: 'ready', services: { browserTools: true }, requestId: res.locals.requestId });
    const limiterConfigured = config.environment !== 'production' || Boolean(config.redisUrl && config.redisToken && config.identitySecret);
    const limiterReady = limiterConfigured && await Promise.race([store!.ready(), new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1600))]);
    const ready = Boolean(config.geminiApiKey) && limiterReady;
    res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not-ready', services: { transcription: Boolean(config.geminiApiKey), rateLimit: limiterReady }, requestId: res.locals.requestId });
  });

  if (!config.transcriptionEnabled) {
    app.all('/api/transcribe', (_req, _res, next) => next(new ApiError(410, 'FEATURE_DISABLED', 'Server-based transcription is temporarily unavailable.')));
  } else {
    app.use('/api', express.json({ limit: BODY_LIMIT, strict: true }));
    const transcriptionLimit = createRateLimitMiddleware({ store: store!, windowMs: 15 * 60_000, max: 5, endpoint: 'transcribe', identity: (req) => {
      requireProductionLimiter(config);
      const secret = config.identitySecret ?? 'local-development-identity-secret-32';
      return hashIdentity(clientIp(req, config.vercel), secret);
    } });
    app.all('/api/transcribe', (req, res, next) => {
      if (req.method !== 'POST') return next(new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.'));
      if (!req.is('application/json')) return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.'));
      next();
    });
    app.post('/api/transcribe', transcriptionLimit, async (req, res, next) => {
    try {
      const { audio, mimeType } = decodeAudio(req.body);
      if (!config.geminiApiKey && !options.generateContent) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Transcription is temporarily unavailable.');
      const providerStarted = Date.now();
      const operation = options.generateContent
        ? options.generateContent(audio, mimeType)
        : import('@google/genai').then(({ GoogleGenAI }) => new GoogleGenAI({ apiKey: config.geminiApiKey! }).models.generateContent({ model: 'gemini-2.5-flash', contents: [{ inlineData: { data: audio, mimeType } }, 'Transcribe the audio with [MM:SS] timestamps. Return only the transcription.'] }).then((result) => result.text || ''));
      const transcription = await Promise.race([operation, new Promise<never>((_, reject) => setTimeout(() => reject(new ApiError(504, 'PROVIDER_TIMEOUT', 'The transcription provider timed out.')), options.providerTimeoutMs ?? PROVIDER_TIMEOUT_MS))]);
      if (!transcription) throw new ApiError(502, 'PROVIDER_ERROR', 'The transcription provider returned no text.');
      console.log(JSON.stringify({ level: 'info', requestId: res.locals.requestId, provider: 'google-gemini', providerLatencyMs: Date.now() - providerStarted }));
      res.json({ transcription, requestId: res.locals.requestId });
    } catch (error) { next(error instanceof ApiError ? error : new ApiError(502, 'PROVIDER_ERROR', 'The transcription provider could not complete the request.')); }
    });
  }

  // ── /api/resolve-social: resolve a social media URL to a downloadable stream ──
  app.all('/api/resolve-social', (req, res, next) => {
    if (req.method !== 'POST') return next(new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.'));
    next();
  });
  app.post('/api/resolve-social', express.json({ limit: '4kb', strict: true }), async (req, res, next) => {
    try {
      const { url } = req.body as Record<string, unknown>;
      if (!url || typeof url !== 'string') throw new ApiError(400, 'BAD_REQUEST', "Missing 'url'.");

      const lowerUrl = url.toLowerCase();
      const isYT = lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be');
      const isTT = lowerUrl.includes('tiktok.com');
      const isIG = lowerUrl.includes('instagram.com');
      const isFB = lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch');
      const platform = isYT ? 'YouTube' : isTT ? 'TikTok' : isIG ? 'Instagram' : isFB ? 'Facebook' : 'Web Video';

      let title = '', thumbnail = '', videoUrl = '', duration = '00:00';

      // 1. YouTube: InnerTube multi-client rotation — tries multiple client types to avoid rate limiting
      if (isYT) {
        const ytId = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
        if (ytId) {
          const ytClients = [
            { clientName: 'ANDROID_VR', clientVersion: '1.57.29', androidSdkVersion: 32, ua: 'com.google.android.apps.youtube.vr.oculus/1.57.29 (Linux; U; Android 12; eureka-user Build/SQ3A.220605.009.A1) gzip' },
            { clientName: 'ANDROID_VR', clientVersion: '1.60.19', androidSdkVersion: 32, ua: 'com.google.android.apps.youtube.vr.oculus/1.60.19 (Linux; U; Android 13; Quest 3 Build/5.1.0) gzip' },
            { clientName: 'ANDROID_VR', clientVersion: '1.62.33', androidSdkVersion: 33, ua: 'com.google.android.apps.youtube.vr.oculus/1.62.33 (Linux; U; Android 14; Quest Pro Build/ST1A.230802.036) gzip' },
          ];
          for (const yc of ytClients) {
            if (videoUrl) break;
            try {
              const ctrl = new AbortController();
              const to = setTimeout(() => ctrl.abort(), 8000);
              const pr = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'User-Agent': yc.ua, 'X-Goog-Api-Format-Version': '2' },
                body: JSON.stringify({
                  videoId: ytId,
                  context: { client: { clientName: yc.clientName, clientVersion: yc.clientVersion, androidSdkVersion: yc.androidSdkVersion, hl: 'en', gl: 'US', osName: 'Android', osVersion: '14' } },
                }),
                signal: ctrl.signal,
              });
              clearTimeout(to);
              if (pr.ok) {
                const pd = await pr.json() as Record<string, any>;
                if (pd.playabilityStatus?.status === 'OK') {
                  const vd = pd.videoDetails;
                  if (vd?.title) title = vd.title;
                  if (vd?.thumbnail?.thumbnails?.length) { const thumbs = vd.thumbnail.thumbnails; thumbnail = thumbs[thumbs.length - 1].url; }
                  if (!thumbnail) thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
                  const secs = parseInt(vd?.lengthSeconds || '0', 10);
                  if (secs) duration = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
                  const formats: any[] = pd.streamingData?.formats || [];
                  const sorted = [...formats].sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
                  const best = sorted.find((f: any) => f.url && (f.height || 999) <= 720) || sorted.find((f: any) => f.url);
                  if (best?.url) videoUrl = best.url;
                }
              }
            } catch { /* try next client */ }
          }
        }
      }

      // 2. yt-dlp fallback (works for YouTube + other platforms when yt-dlp is available on the server)
      if (!videoUrl) {
        const ytdlpResult = await resolveWithYtdlp(url);
        if (ytdlpResult) {
          videoUrl = ytdlpResult.videoUrl;
          if (!title && ytdlpResult.title) title = ytdlpResult.title;
          if (!thumbnail && ytdlpResult.thumbnail) thumbnail = ytdlpResult.thumbnail;
          if (duration === '00:00' && ytdlpResult.duration !== '00:00') duration = ytdlpResult.duration;
        }
      }

      // 3. TikTok: tikwm.com free API (no auth required)
      if (!videoUrl && isTT) {
        try {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 10000);
          const tr = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: ctrl.signal,
          });
          clearTimeout(to);
          if (tr.ok) {
            const td = await tr.json() as Record<string, any>;
            if (td.code === 0 && td.data) {
              videoUrl = td.data.hdplay || td.data.play || '';
              if (!title && td.data.title) title = td.data.title;
              if (!thumbnail && td.data.cover) thumbnail = td.data.cover;
              if (duration === '00:00' && td.data.duration) {
                const secs = parseInt(td.data.duration, 10);
                if (secs) duration = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
              }
            }
          }
        } catch { /* tikwm failed, fall through to Cobalt */ }
      }

      // 4. Cobalt race for stream URL (all platforms, including YouTube fallback)
      if (!videoUrl) {
        const cobaltEndpoints = ['https://cobalt.api.red.velvet.ink/', 'https://api.cobalt.tools/', 'https://cobalt.catvibers.me/', 'https://api.cobalt.best/'];
        const cobaltBody = JSON.stringify({ url, vQuality: '720', videoQuality: '720', filenameStyle: 'classic' });
        const tryCobalt = async (ep: string) => {
          let validated: URL;
          try { validated = await validateOutboundUrl(ep); } catch { throw new Error('Invalid endpoint'); }
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 6000);
          try {
            const r = await fetch(validated, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: cobaltBody, signal: ctrl.signal });
            clearTimeout(t);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json() as Record<string, any>;
            if (['stream', 'tunnel', 'redirect'].includes(d.status)) return { videoUrl: d.url as string, title: (d.filename || '').replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim(), thumbnail: d.thumbnail || '' };
            if (d.status === 'picker' && d.picker?.length) return { videoUrl: d.picker[0].url as string, title: '', thumbnail: d.picker[0].thumb || '' };
            throw new Error(`status=${d.status}`);
          } finally { clearTimeout(t); }
        };
        try {
          const r = await Promise.any(cobaltEndpoints.map(ep => tryCobalt(ep)));
          videoUrl = r.videoUrl;
          if (!title && r.title) title = r.title;
          if (!thumbnail && r.thumbnail) thumbnail = r.thumbnail;
        } catch { /* all Cobalt instances failed */ }
      }

      // 5. Metadata fallback: YouTube oEmbed or OG scrape
      if (!title || !thumbnail) {
        if (isYT) {
        const ytId = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/)?.[1];
          if (ytId) {
            try {
              const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`);
              if (oe.ok) { const od = await oe.json() as Record<string, any>; if (!title) title = od.title; if (!thumbnail) thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`; }
            } catch { /* ignore */ }
          }
        } else {
          try {
            const ctrl = new AbortController();
            const t = setTimeout(() => ctrl.abort(), 3000);
            const r = await fetch(url, { headers: { 'User-Agent': 'facebookexternalhit/1.1' }, signal: ctrl.signal });
            clearTimeout(t);
            if (r.ok) {
              const html = await r.text();
              if (!title) { const m = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i); if (m) title = m[1].replace(/&amp;/g, '&').trim(); }
              if (!thumbnail) { const m = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i); if (m) thumbnail = m[1]; }
            }
          } catch { /* ignore */ }
        }
      }

      if (!videoUrl) throw new ApiError(422, 'PROVIDER_ERROR', isYT
        ? 'All extraction methods failed. YouTube may be blocking this server\'s IP, or the video is private/age-restricted. Try again later or use a different link.'
        : 'Could not extract a stream URL. The link may be private, expired, or unsupported.');
      if (!title) title = `${platform} Video`;
      if (!thumbnail) thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60';

      res.json({ title, thumbnail, videoUrl, duration, platform, requestId: res.locals.requestId });
    } catch (error) { next(error instanceof ApiError ? error : new ApiError(502, 'PROVIDER_ERROR', 'The resolver could not process this request.')); }
  });

  // ── /api/media-proxy: stream external media through the server with SSRF protection ──
  app.get('/api/media-proxy', async (req, res, next) => {
    try {
      const { url, filename } = req.query as Record<string, string>;
      if (!url || typeof url !== 'string') throw new ApiError(400, 'BAD_REQUEST', "Missing 'url'.");

      let validated: URL;
      try { validated = await validateOutboundUrl(url); } catch { throw new ApiError(403, 'BAD_REQUEST', 'The target URL is not allowed.'); }

      const rangeHeader = req.headers.range;
      const fetchHeaders: Record<string, string> = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8' };
      if (rangeHeader) fetchHeaders['Range'] = rangeHeader;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      req.on('close', () => { clearTimeout(timeout); controller.abort(); });

      const upstream = await fetch(validated, { headers: fetchHeaders, signal: controller.signal, redirect: 'follow' });
      clearTimeout(timeout);

      if (!upstream.ok && upstream.status !== 206) {
        throw new ApiError(502, 'PROVIDER_ERROR', `Upstream returned ${upstream.status}.`);
      }

      const ct = upstream.headers.get('Content-Type') || 'video/mp4';
      const cl = upstream.headers.get('Content-Length');
      const cr = upstream.headers.get('Content-Range');
      const safeFilename = (filename || 'video').replace(/[^a-zA-Z0-9._-]/g, '_');

      res.status(upstream.status === 206 ? 206 : 200);
      res.setHeader('Content-Type', ct);
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}.mp4"`);
      res.setHeader('Accept-Ranges', 'bytes');
      if (cl) res.setHeader('Content-Length', cl);
      if (cr) res.setHeader('Content-Range', cr);

      if (!upstream.body) { res.end(); return; }
      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          const ok = res.write(value);
          if (!ok) await new Promise(r => res.once('drain', r));
        }
      };
      await pump();
    } catch (error) {
      if (error instanceof ApiError) return next(error);
      if (error instanceof DOMException && error.name === 'AbortError') return next(new ApiError(504, 'PROVIDER_TIMEOUT', 'Upstream timed out.'));
      next(new ApiError(502, 'PROVIDER_ERROR', 'The proxy could not process this request.'));
    }
  });

  const cobaltProvider = config.cobaltApiUrl ? new CobaltProvider(config.cobaltApiUrl, config.cobaltApiKey) : null;

  const downloadParser = express.json({ limit: '16kb', strict: true });
  const PLATFORMS: Platform[] = ['youtube', 'instagram', 'tiktok', 'facebook'];

  for (const platform of PLATFORMS) {
    app.all(`/api/download/${platform}`, (req, res, next) => {
      if (req.method !== 'POST') return next(new ApiError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this endpoint.'));
      if (!req.is('application/json')) return next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json.'));
      next();
    });
    app.post(`/api/download/${platform}`, downloadParser, async (req, res, next) => {
      try {
        if (!cobaltProvider) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Social download service is not configured.');
        const body = req.body as Record<string, unknown>;
        const keys = Object.keys(body);
        if (keys.some((k) => !['url', 'videoQuality', 'audioFormat', 'downloadMode'].includes(k))) {
          throw new ApiError(400, 'BAD_REQUEST', 'The request contains unsupported fields.');
        }
        const { url, videoQuality, audioFormat, downloadMode } = body;
        if (typeof url !== 'string' || !url.trim()) throw new ApiError(400, 'BAD_REQUEST', 'A URL is required.');
        const validation = validatePlatformUrl(platform, url);
        if (!validation.valid) throw new ApiError(400, 'BAD_REQUEST', validation.error!);
        const result = await cobaltProvider.resolve(platform, validation.normalizedUrl, {
          videoQuality: typeof videoQuality === 'string' ? videoQuality : undefined,
          audioFormat: typeof audioFormat === 'string' ? audioFormat : undefined,
          downloadMode: typeof downloadMode === 'string' ? downloadMode : undefined,
        });
        if (result.status === 'error') {
          const code = result.errorCode === 'PROVIDER_NOT_CONFIGURED' ? 'SERVICE_UNAVAILABLE'
            : result.errorCode === 'PROVIDER_TIMEOUT' ? 'PROVIDER_TIMEOUT'
            : 'PROVIDER_ERROR';
          const status = code === 'SERVICE_UNAVAILABLE' ? 503 : code === 'PROVIDER_TIMEOUT' ? 504 : 502;
          throw new ApiError(status, code, `The download provider could not resolve this URL.`);
        }
        res.json({ ...result, requestId: res.locals.requestId });
      } catch (error) { next(error instanceof ApiError ? error : new ApiError(502, 'PROVIDER_ERROR', 'The download provider could not complete the request.')); }
    });
  }

  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'API route not found.')));
  app.use(errorMiddleware);
  return app;
}

export default function handler(req: Request, res: Response) {
  try { return createApp()(req, res); }
  catch { return sendError(res, requestId(req), new ApiError(500, 'SERVICE_UNAVAILABLE', 'The service is temporarily unavailable.')); }
}
