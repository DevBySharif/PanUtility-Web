import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export type ApiErrorCode = 'BAD_REQUEST' | 'INVALID_ORIGIN' | 'METHOD_NOT_ALLOWED' | 'UNSUPPORTED_MEDIA_TYPE' | 'PAYLOAD_TOO_LARGE' | 'RATE_LIMITED' | 'SERVICE_UNAVAILABLE' | 'PROVIDER_TIMEOUT' | 'PROVIDER_ERROR' | 'FEATURE_DISABLED' | 'NOT_FOUND';

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  retryAfter?: number;
  constructor(status: number, code: ApiErrorCode, message: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export function requestId(req: Request): string {
  return String(req.headers['x-request-id'] || crypto.randomUUID()).slice(0, 80).replace(/[^a-zA-Z0-9._-]/g, '') || crypto.randomUUID();
}

export function sendError(res: Response, id: string, error: ApiError): void {
  if (error.retryAfter) res.setHeader('Retry-After', String(error.retryAfter));
  res.status(error.status).json({ error: { code: error.code, message: error.message, requestId: id } });
}

export function errorMiddleware(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  const id = String(res.locals.requestId || requestId(req));
  const parserError = error as { type?: string; status?: number };
  const safe = error instanceof ApiError ? error
    : parserError.type === 'entity.too.large' ? new ApiError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.')
    : error instanceof SyntaxError && parserError.status === 400 ? new ApiError(400, 'BAD_REQUEST', 'The JSON request body is malformed.')
    : new ApiError(500, 'PROVIDER_ERROR', 'The service could not complete the request.');
  console.error(JSON.stringify({ level: 'error', requestId: id, route: req.path, code: safe.code, detail: redact(error instanceof Error ? error.message : String(error)) }));
  if (!res.headersSent) sendError(res, id, safe);
}

export function redact(value: string): string {
  return value
    .replace(/(api[_-]?key|authorization|cookie|token|audio|base64)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/[A-Za-z0-9+/]{80,}={0,2}/g, '[REDACTED_PAYLOAD]')
    .replace(/https?:\/\/[^\s]+/gi, '[REDACTED_URL]')
    .slice(0, 500);
}
