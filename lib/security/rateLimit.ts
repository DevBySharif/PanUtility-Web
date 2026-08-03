import type { NextFunction, Request, Response } from 'express';
import { ApiError } from './errors.js';

export interface RateLimitStore { increment(key: string, ttlMs: number): Promise<{ count: number; resetAt: number }>; ready(): Promise<boolean>; reset?(): Promise<void> }
interface Entry { count: number; resetAt: number }

export class MemoryRateLimitStore implements RateLimitStore {
  private entries = new Map<string, Entry>();
  private maxEntries: number;
  private now: () => number;
  constructor(maxEntries = 10_000, now: () => number = Date.now) { this.maxEntries = maxEntries; this.now = now; }
  async increment(key: string, ttlMs: number) {
    const time = this.now(); this.cleanup(time);
    const current = this.entries.get(key);
    const entry = !current || current.resetAt <= time ? { count: 1, resetAt: time + ttlMs } : { ...current, count: current.count + 1 };
    this.entries.set(key, entry);
    while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value as string);
    return entry;
  }
  cleanup(time = this.now()) { for (const [key, entry] of this.entries) if (entry.resetAt <= time) this.entries.delete(key); }
  async ready() { return true; }
  async reset() { this.entries.clear(); }
  size() { return this.entries.size; }
}

export class UpstashRateLimitStore implements RateLimitStore {
  private url: string;
  private token: string;
  private fetchImpl: typeof fetch;
  private timeoutMs: number;
  constructor(url: string, token: string, fetchImpl: typeof fetch = fetch, timeoutMs = 1500) { this.url = url; this.token = token; this.fetchImpl = fetchImpl; this.timeoutMs = timeoutMs; }
  async command(commands: string[][]) {
    const response = await this.fetchImpl(`${this.url.replace(/\/$/, '')}/multi-exec`, { method: 'POST', headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands), signal: AbortSignal.timeout(this.timeoutMs) });
    if (!response.ok) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Rate-limit protection is temporarily unavailable.');
    const result = await response.json() as Array<{ result?: unknown; error?: string }>;
    if (!Array.isArray(result) || result.some((item) => item.error)) throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Rate-limit protection is temporarily unavailable.');
    return result;
  }
  async increment(key: string, ttlMs: number) {
    try {
      const result = await this.command([['INCR', key], ['PEXPIRE', key, String(ttlMs), 'NX'], ['PTTL', key]]);
      const count = Number(result[0].result); const remaining = Number(result[2].result);
      if (!Number.isInteger(count) || remaining < 0) throw new Error('invalid store response');
      return { count, resetAt: Date.now() + remaining };
    } catch (error) { if (error instanceof ApiError) throw error; throw new ApiError(503, 'SERVICE_UNAVAILABLE', 'Rate-limit protection is temporarily unavailable.'); }
  }
  async ready() { try { const result = await this.command([['PING']]); return result[0].result === 'PONG'; } catch { return false; } }
}

export function createRateLimitMiddleware(options: { store: RateLimitStore; windowMs: number; max: number; endpoint: string; identity: (req: Request) => string | Promise<string> }) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const identity = await options.identity(req);
      const entry = await options.store.increment(`panutility:rl:${options.endpoint}:${identity}`, options.windowMs);
      if (entry.count > options.max) return next(new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again later.', Math.max(1, Math.ceil((entry.resetAt - Date.now()) / 1000))));
      next();
    } catch (error) { next(error instanceof ApiError ? error : new ApiError(503, 'SERVICE_UNAVAILABLE', 'Rate-limit protection is temporarily unavailable.')); }
  };
}
