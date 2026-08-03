import crypto from 'node:crypto';
import net from 'node:net';
import type { Request } from 'express';
import { ApiError } from './errors';

export function normalizeIp(raw: string): string {
  const value = raw.trim().toLowerCase();
  const mapped = value.startsWith('::ffff:') ? value.slice(7) : value;
  if (!net.isIP(mapped)) throw new ApiError(400, 'BAD_REQUEST', 'Client identity is invalid.');
  return mapped;
}

export function clientIp(req: Request, isVercel: boolean): string {
  if (isVercel) {
    const header = req.get('x-vercel-forwarded-for');
    if (!header || header.includes(',')) throw new ApiError(400, 'BAD_REQUEST', 'Client identity is invalid.');
    return normalizeIp(header);
  }
  return normalizeIp(req.socket.remoteAddress || '127.0.0.1');
}

export function hashIdentity(ip: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(normalizeIp(ip)).digest('base64url');
}
