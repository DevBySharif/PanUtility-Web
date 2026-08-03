# API security model

## P0-C production addendum

Vercel documents a 4.5 MB function payload ceiling. Production JSON is therefore capped at 4.25 MiB and decoded audio at 3 MiB after accounting for Base64 expansion. Gemini has one attempt and a 20-second application timeout below the 30-second function limit.

Local development uses a bounded memory rate-limit store. Production requires the shared TTL-backed adapter plus a 32+ character HMAC identity secret and returns controlled 503 rather than falling back. Only Vercel's overwritten, single `x-vercel-forwarded-for` value is accepted in Vercel mode; local mode ignores forwarding headers. Raw IPs are not stored or logged.

Production origins are exact HTTPS origins. Loopback defaults exist only outside production, missing transcription origins are rejected in production, and arbitrary Vercel previews are never automatically accepted.

## Public surface

- `POST /api/transcribe`: enabled, anonymous with per-IP abuse control. JSON upload only; remote file URLs are rejected.
- `/api/resolve-social`: disabled with HTTP 410.
- `/api/media-proxy`: disabled with HTTP 410; arbitrary or unsigned URLs cannot be relayed.

The site does not require accounts. Anonymous public access is appropriate for the retained transcription flow, but it is protected by five requests per IP per rolling 15 minutes. The bounded in-memory limiter is suitable for local/single-instance protection; production serverless deployments should use a shared TTL store such as managed Redis to enforce a global quota across instances.

## Request policy

Browser origins are exact-match values from `ALLOWED_ORIGINS`; defaults are the production origin and loopback development origins. Origins are never reflected unless allowed, wildcard CORS is not used, and origin-dependent responses set `Vary: Origin`. Transcription permits POST JSON only. API responses are `no-store`.

Transcription JSON is limited to 4.25 MiB. Decoded audio is limited to 3 MiB, must be non-empty strict Base64, use an allowed audio MIME, and match a supported MP3/WAV/Ogg/WebM/MP4/AAC/FLAC signature where practical. Unknown fields—including `fileUrl`—are rejected. Gemini has one attempt and a 20-second application timeout. Missing configuration produces controlled HTTP 503.

## Outbound policy

The shared outbound utility defaults to HTTPS, rejects credentials and ambiguous/malformed URLs, normalizes hostnames, resolves every hostname address, and fails closed on DNS errors or empty/mixed-private answers. It rejects IPv4 unspecified, loopback, RFC1918, CGNAT, link-local, metadata, protocol-assignment, documentation, benchmarking, multicast, reserved and future-use ranges. It rejects IPv6 unspecified, loopback, unique-local, link-local, multicast, documentation, and IPv4-mapped non-public addresses.

Redirects are manual, capped at three, loop-detected, revalidated at every destination, and cannot downgrade HTTPS. Fetches use an explicit user agent, identity encoding, no forwarded credentials/cookies, total timeout, accepted status/MIME policy, declared and streamed byte limits, reader cancellation on overflow, and safe internal errors. No enabled route currently accepts a remote resource URL; the utility is tested and ready only for a future reviewed provider integration.

## Headers and logging

CSP forbids `unsafe-eval`, objects, foreign scripts, and framing. Production scripts do not allow `unsafe-inline`; the local Vite development server alone requires inline preamble scripts and WebSocket connections. The app also sets HSTS in production, nosniff, strict-origin referrer policy, a restrictive permissions policy, and controlled caching. Existing inline styles require CSP `style-src 'unsafe-inline'` for document pages; API CSP is `default-src 'none'`.

Logs are one-line JSON containing request ID, route without query string, method, status, duration, provider name/latency, and normalized errors. Redaction removes URLs, credentials, tokens, cookies, and long Base64-like payloads. Audio and signed tokens are never logged.
