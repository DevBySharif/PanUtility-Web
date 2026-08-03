import { describe, expect, it, vi } from 'vitest';
import { isPublicIp, secureFetch, validateOutboundUrl } from '../api/security/outbound';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

describe('SSRF policy', () => {
  it.each(['not a url','ftp://example.com/a','https://user:pass@example.com','https://localhost/a','https://127.0.0.1/a','https://10.0.0.1/a','https://172.16.1.1/a','https://192.168.1.1/a','https://169.254.169.254/a','https://100.64.0.1/a','https://224.0.0.1/a','https://192.0.2.1/a','https://240.0.0.1/a','https://[::1]/a','https://[fd00::1]/a','https://[fe80::1]/a','https://[ff02::1]/a','https://[::ffff:127.0.0.1]/a'])('rejects %s', async (url) => {
    await expect(validateOutboundUrl(url, { lookup: publicLookup })).rejects.toBeTruthy();
  });

  it('classifies representative public and private addresses', () => {
    expect(isPublicIp('8.8.8.8')).toBe(true);
    expect(isPublicIp('2001:4860:4860::8888')).toBe(true);
    expect(isPublicIp('198.51.100.1')).toBe(false);
    expect(isPublicIp('2001:db8::1')).toBe(false);
  });

  it('fails closed on DNS failure and mixed public/private answers', async () => {
    await expect(validateOutboundUrl('https://example.com', { lookup: async () => { throw new Error('dns'); } })).rejects.toBeTruthy();
    await expect(validateOutboundUrl('https://example.com', { lookup: async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }] })).rejects.toBeTruthy();
  });
});

describe('secure redirects and bounded responses', () => {
  it.each(['https://127.0.0.1/x','https://localhost/x','https://10.0.0.2/x','https://[::1]/x','https://169.254.169.254/x'])('revalidates redirect to %s', async (location) => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location } })) as typeof fetch;
    await expect(secureFetch('https://example.com', { fetchImpl, lookup: publicLookup, maxBytes: 10, timeoutMs: 1000, acceptedMime: /^audio\// })).rejects.toBeTruthy();
  });

  it('rejects loops, excessive redirects, malformed locations, and downgrade', async () => {
    const loop = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://example.com' } })) as typeof fetch;
    await expect(secureFetch('https://example.com', { fetchImpl: loop, lookup: publicLookup, maxBytes: 10, timeoutMs: 1000, acceptedMime: /^audio\// })).rejects.toBeTruthy();
    let count = 0;
    const excessive = vi.fn(async () => new Response(null, { status: 302, headers: { location: `https://example.com/${++count}` } })) as typeof fetch;
    await expect(secureFetch('https://example.com', { fetchImpl: excessive, lookup: publicLookup, maxRedirects: 1, maxBytes: 10, timeoutMs: 1000, acceptedMime: /^audio\// })).rejects.toBeTruthy();
    const malformed = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://[' } })) as typeof fetch;
    await expect(secureFetch('https://example.com', { fetchImpl: malformed, lookup: publicLookup, maxBytes: 10, timeoutMs: 1000, acceptedMime: /^audio\// })).rejects.toBeTruthy();
    const downgrade = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://example.com' } })) as typeof fetch;
    await expect(secureFetch('https://example.com', { fetchImpl: downgrade, lookup: publicLookup, allowHttp: true, maxBytes: 10, timeoutMs: 1000, acceptedMime: /^audio\// })).rejects.toBeTruthy();
  });

  it('accepts bounded allowed content and rejects MIME, status, and byte overflow', async () => {
    const good = vi.fn(async () => new Response(new Uint8Array([1,2,3]), { status: 200, headers: { 'content-type': 'audio/mpeg' } })) as typeof fetch;
    await expect(secureFetch('https://example.com/a', { fetchImpl: good, lookup: publicLookup, maxBytes: 3, timeoutMs: 1000, acceptedMime: /^audio\// })).resolves.toMatchObject({ bytes: new Uint8Array([1,2,3]) });
    const html = vi.fn(async () => new Response('x', { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch;
    await expect(secureFetch('https://example.com/a', { fetchImpl: html, lookup: publicLookup, maxBytes: 3, timeoutMs: 1000, acceptedMime: /^audio\// })).rejects.toBeTruthy();
    const large = vi.fn(async () => new Response(new Uint8Array(4), { status: 200, headers: { 'content-type': 'audio/mpeg' } })) as typeof fetch;
    await expect(secureFetch('https://example.com/a', { fetchImpl: large, lookup: publicLookup, maxBytes: 3, timeoutMs: 1000, acceptedMime: /^audio\// })).rejects.toBeTruthy();
  });
});
