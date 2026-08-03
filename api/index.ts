import express, { type NextFunction, type Request, type Response } from 'express';
import { GoogleGenAI } from '@google/genai';
import { ApiError, errorMiddleware, requestId, sendError } from './security/errors.ts';
import { clientIp, hashIdentity } from './security/clientIdentity.ts';
import { MemoryRateLimitStore, UpstashRateLimitStore, createRateLimitMiddleware, type RateLimitStore } from './security/rateLimit.ts';
import { loadConfig, requireProductionLimiter, type AppConfig } from './config.ts';

export const AUDIO_MAX_BYTES = 3 * 1024 * 1024;
export const BODY_LIMIT = '4.25mb';
const PROVIDER_TIMEOUT_MS = 20_000;
const AUDIO_MIME = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac']);

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
        : new GoogleGenAI({ apiKey: config.geminiApiKey! }).models.generateContent({ model: 'gemini-2.5-flash', contents: [{ inlineData: { data: audio, mimeType } }, 'Transcribe the audio with [MM:SS] timestamps. Return only the transcription.'] }).then((result) => result.text || '');
      const transcription = await Promise.race([operation, new Promise<never>((_, reject) => setTimeout(() => reject(new ApiError(504, 'PROVIDER_TIMEOUT', 'The transcription provider timed out.')), options.providerTimeoutMs ?? PROVIDER_TIMEOUT_MS))]);
      if (!transcription) throw new ApiError(502, 'PROVIDER_ERROR', 'The transcription provider returned no text.');
      console.log(JSON.stringify({ level: 'info', requestId: res.locals.requestId, provider: 'google-gemini', providerLatencyMs: Date.now() - providerStarted }));
      res.json({ transcription, requestId: res.locals.requestId });
    } catch (error) { next(error instanceof ApiError ? error : new ApiError(502, 'PROVIDER_ERROR', 'The transcription provider could not complete the request.')); }
    });
  }

  for (const route of ['/api/resolve-social', '/api/media-proxy']) app.all(route, (_req, _res, next) => next(new ApiError(410, 'FEATURE_DISABLED', 'This feature is temporarily unavailable.')));
  app.use('/api', (_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'API route not found.')));
  app.use(errorMiddleware);
  return app;
}

export default function handler(req: Request, res: Response) {
  try { return createApp()(req, res); }
  catch { return sendError(res, requestId(req), new ApiError(500, 'SERVICE_UNAVAILABLE', 'The service is temporarily unavailable.')); }
}
