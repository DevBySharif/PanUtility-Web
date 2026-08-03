import { describe, expect, it, vi } from 'vitest';
import { createRateLimitMiddleware, MemoryRateLimitStore, UpstashRateLimitStore } from '../lib/security/rateLimit';

describe('rate-limit stores', () => {
  it('increments atomically by identity/endpoint, expires TTL, and bounds memory', async () => {
    let now = 0; const store = new MemoryRateLimitStore(2, () => now);
    expect((await store.increment('transcribe:a', 1000)).count).toBe(1);
    expect((await store.increment('transcribe:a', 1000)).count).toBe(2);
    expect((await store.increment('other:a', 1000)).count).toBe(1);
    await store.increment('transcribe:b', 1000); expect(store.size()).toBe(2);
    now = 1001; store.cleanup(); expect(store.size()).toBe(0);
    expect((await store.increment('transcribe:a', 1000)).count).toBe(1);
  });

  it('uses one shared atomic transaction without leaking token in its body', async () => {
    const fetchImpl = vi.fn(async (_url, init) => {
      expect(String(init?.body)).toContain('INCR'); expect(String(init?.body)).toContain('PEXPIRE'); expect(String(init?.body)).not.toContain('secret-token');
      return new Response(JSON.stringify([{ result: 2 }, { result: 1 }, { result: 900 }]), { status: 200 });
    }) as typeof fetch;
    const result = await new UpstashRateLimitStore('https://redis.example', 'secret-token', fetchImpl).increment('safe-hash', 1000);
    expect(result.count).toBe(2); expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('fails closed on shared-store timeout/unavailability', async () => {
    const failed = vi.fn(async () => { throw new Error('timeout'); }) as typeof fetch;
    await expect(new UpstashRateLimitStore('https://redis.example', 'token', failed, 1).increment('key', 1000)).rejects.toMatchObject({ status: 503 });
    const middleware = createRateLimitMiddleware({ store: { increment: async () => { throw new Error('down'); }, ready: async () => false }, windowMs: 1000, max: 1, endpoint: 'transcribe', identity: () => 'hash' });
    const next = vi.fn(); await middleware({} as never, {} as never, next); expect(next.mock.calls[0][0]).toMatchObject({ status: 503 });
  });
});
