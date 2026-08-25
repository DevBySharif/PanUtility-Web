import { ApiError } from './security/errors.js';

export interface AppConfig {
  environment: 'development' | 'test' | 'production';
  vercel: boolean;
  vercelEnvironment?: 'production' | 'preview' | 'development';
  transcriptionEnabled: boolean;
  geminiApiKey?: string;
  allowedOrigins: Set<string>;
  redisUrl?: string;
  redisToken?: string;
  identitySecret?: string;
  cobaltApiUrl?: string;
  cobaltApiKey?: string;
}

function normalizeOrigin(value: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('ALLOWED_ORIGINS contains an invalid origin.'); }
  if (url.origin !== value || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('ALLOWED_ORIGINS must contain exact origins without paths or trailing slashes.');
  if (url.hostname.endsWith('.') || (url.protocol !== 'https:' && url.hostname !== 'localhost' && url.hostname !== '127.0.0.1')) throw new Error('ALLOWED_ORIGINS contains an insecure origin.');
  return url.origin;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawEnvironment = env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(rawEnvironment)) throw new Error('NODE_ENV is invalid.');
  const environment = rawEnvironment as AppConfig['environment'];
  const vercelEnvironment = ['production', 'preview', 'development'].includes(env.VERCEL_ENV || '') ? env.VERCEL_ENV as AppConfig['vercelEnvironment'] : undefined;
  if (env.VERCEL_ENV && !vercelEnvironment) throw new Error('VERCEL_ENV is invalid.');
  const defaultOrigins = environment === 'production'
    ? 'https://omnitily.vercel.app'
    : 'https://omnitily.vercel.app,http://localhost:3000,http://127.0.0.1:3000';
  const rawOrigins = env.ALLOWED_ORIGINS || defaultOrigins;
  const allowedOrigins = new Set(rawOrigins.split(',').map((item) => normalizeOrigin(item.trim())));
  if (environment === 'production' && [...allowedOrigins].some((origin) => !origin.startsWith('https://'))) throw new Error('Production origins must use HTTPS.');
  const rawTranscriptionFlag = env.ENABLE_TRANSCRIPTION || 'false';
  if (!['true', 'false'].includes(rawTranscriptionFlag)) throw new Error('ENABLE_TRANSCRIPTION must be true or false.');
  if (environment === 'production' && rawTranscriptionFlag === 'true') throw new Error('Transcription cannot be enabled in the zero-cost production deployment.');
  const transcriptionEnabled = rawTranscriptionFlag === 'true';
  const redisUrl = transcriptionEnabled ? env.UPSTASH_REDIS_REST_URL : undefined;
  const redisToken = transcriptionEnabled ? env.UPSTASH_REDIS_REST_TOKEN : undefined;
  if (transcriptionEnabled && Boolean(redisUrl) !== Boolean(redisToken)) throw new Error('Shared rate-limit URL and token must be configured together.');
  if (redisUrl && (!redisUrl.startsWith('https://') || new URL(redisUrl).username || new URL(redisUrl).password)) throw new Error('Shared rate-limit URL must be credential-free HTTPS.');
  const identitySecret = transcriptionEnabled ? env.RATE_LIMIT_IDENTITY_SECRET : undefined;
  if (identitySecret && identitySecret.length < 32) throw new Error('Rate-limit identity secret must be at least 32 characters.');
  const cobaltApiUrl = env.COBALT_API_URL || undefined;
  const cobaltApiKey = env.COBALT_API_KEY || undefined;
  return { environment, vercel: env.VERCEL === '1', vercelEnvironment, transcriptionEnabled, geminiApiKey: transcriptionEnabled ? env.GEMINI_API_KEY || undefined : undefined, allowedOrigins, redisUrl, redisToken, identitySecret, cobaltApiUrl, cobaltApiKey };
}

export function requireProductionLimiter(config: AppConfig): void {
  if (config.environment === 'production' && (!config.redisUrl || !config.redisToken || !config.identitySecret)) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Transcription is temporarily unavailable.');
}
