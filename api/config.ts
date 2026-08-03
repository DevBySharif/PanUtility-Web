import { ApiError } from './security/errors.ts';

export interface AppConfig {
  environment: 'development' | 'test' | 'production';
  vercel: boolean;
  vercelEnvironment?: 'production' | 'preview' | 'development';
  geminiApiKey?: string;
  allowedOrigins: Set<string>;
  redisUrl?: string;
  redisToken?: string;
  identitySecret?: string;
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
  const localDefaults = 'https://panutility.vercel.app,http://localhost:3000,http://127.0.0.1:3000';
  const rawOrigins = env.ALLOWED_ORIGINS || (environment === 'production' ? '' : localDefaults);
  if (!rawOrigins) throw new Error('ALLOWED_ORIGINS is required in production.');
  const allowedOrigins = new Set(rawOrigins.split(',').map((item) => normalizeOrigin(item.trim())));
  if (environment === 'production' && [...allowedOrigins].some((origin) => !origin.startsWith('https://'))) throw new Error('Production origins must use HTTPS.');
  const redisUrl = env.UPSTASH_REDIS_REST_URL;
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN;
  if (Boolean(redisUrl) !== Boolean(redisToken)) throw new Error('Shared rate-limit URL and token must be configured together.');
  if (redisUrl && (!redisUrl.startsWith('https://') || new URL(redisUrl).username || new URL(redisUrl).password)) throw new Error('Shared rate-limit URL must be credential-free HTTPS.');
  const identitySecret = env.RATE_LIMIT_IDENTITY_SECRET;
  if (identitySecret && identitySecret.length < 32) throw new Error('Rate-limit identity secret must be at least 32 characters.');
  return { environment, vercel: env.VERCEL === '1', vercelEnvironment, geminiApiKey: env.GEMINI_API_KEY || undefined, allowedOrigins, redisUrl, redisToken, identitySecret };
}

export function requireProductionLimiter(config: AppConfig): void {
  if (config.environment === 'production' && (!config.redisUrl || !config.redisToken || !config.identitySecret)) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Transcription is temporarily unavailable.');
}
