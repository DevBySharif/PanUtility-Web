import type { Platform } from './types.js';

interface PlatformPattern {
  hostnames: string[];
  pathname?: RegExp;
  description: string;
}

const PATTERNS: Record<Platform, PlatformPattern> = {
  youtube: {
    hostnames: ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'],
    pathname: /^\/(watch|shorts|embed|v|live)\/|^\//,
    description: 'YouTube video, short, or music URL',
  },
  instagram: {
    hostnames: ['instagram.com', 'www.instagram.com'],
    pathname: /^\/(p|reel|reels|tv|stories)\//,
    description: 'Instagram post, reel, story, or TV URL',
  },
  tiktok: {
    hostnames: ['tiktok.com', 'www.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com'],
    pathname: /^\/@[^/]+\/video\/|^\//,
    description: 'TikTok video URL',
  },
  facebook: {
    hostnames: ['facebook.com', 'www.facebook.com', 'web.facebook.com', 'm.facebook.com', 'fb.watch'],
    pathname: /^\/(watch|reel|share)\/|^\//,
    description: 'Facebook video, reel, or watch URL',
  },
};

const PLATFORM_DISPLAY: Record<Platform, string> = {
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
};

const CREDENTIAL_PATTERNS = [
  /[?&](access_token|token|key|api_key|session|cookie|auth)=/i,
];

export interface ValidationResult {
  valid: boolean;
  platform: Platform;
  normalizedUrl: string;
  error?: string;
}

export function validatePlatformUrl(platform: Platform, rawUrl: string): ValidationResult {
  const trimmed = rawUrl.trim();
  if (!trimmed) return { valid: false, platform, normalizedUrl: '', error: 'URL is required.' };

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { valid: false, platform, normalizedUrl: '', error: 'Invalid URL format.' };
  }

  if (url.protocol !== 'https:') {
    return { valid: false, platform, normalizedUrl: '', error: 'Only HTTPS URLs are supported.' };
  }

  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(url.href)) {
      return { valid: false, platform, normalizedUrl: '', error: 'URLs containing credentials or tokens are not allowed.' };
    }
  }

  const config = PATTERNS[platform];
  const displayName = PLATFORM_DISPLAY[platform];
  const hostname = url.hostname.toLowerCase();

  const matchesPlatform = config.hostnames.some((h) => hostname === h || hostname.endsWith('.' + h));
  if (!matchesPlatform) {
    return { valid: false, platform, normalizedUrl: '', error: `This does not appear to be a ${displayName} URL.` };
  }

  if (config.pathname && !config.pathname.test(url.pathname)) {
    return { valid: false, platform, normalizedUrl: '', error: `URL path does not match a supported ${displayName} format.` };
  }

  const normalized = url.origin + url.pathname + url.search;
  return { valid: true, platform, normalizedUrl: normalized };
}

export function detectPlatform(rawUrl: string): Platform | null {
  const trimmed = rawUrl.trim().toLowerCase();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return null;

  try {
    const url = new URL(trimmed);
    const hostname = url.hostname.toLowerCase();

    for (const [platform, config] of Object.entries(PATTERNS)) {
      const matches = config.hostnames.some((h) => hostname === h || hostname.endsWith('.' + h));
      if (matches) return platform as Platform;
    }
  } catch { /* invalid URL */ }

  return null;
}

export function getSupportedPlatforms(): Platform[] {
  return Object.keys(PATTERNS) as Platform[];
}
