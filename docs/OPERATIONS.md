# Operations

## Health and readiness

`GET /api/health` confirms only that the API process responds. In zero-cost production, `GET /api/readiness` returns `200 ready` for the browser-tool deployment and does not report intentionally disabled transcription as an outage. Both are lightweight and `no-store`.

## Rate limits and privacy

Transcription is disabled in zero-cost production and `/api/transcribe` returns `410 FEATURE_DISABLED` before JSON parsing, provider initialization, or rate-limit storage initialization. The retained development/test implementation uses privacy-safe HMAC identities and must never become a per-instance production fallback.

## Logs and incidents

Logs contain request ID, route without query, method, status, duration, provider name/latency, and normalized error code. Never log audio/Base64, raw IPs, origins containing private data, cookies, authorization, Redis credentials, Gemini keys, or upstream bodies.

No Gemini key is configured for zero-cost production. If server transcription is reintroduced in the future, treat a suspected key exposure by disabling the feature, revoking the key, reviewing request IDs and quota activity, and completing a security review before re-enabling it.

## Rollback

Use Vercel's deployment history to promote the last verified deployment. Restore environment variables only from the protected production environment, then run the deployment verifier. Do not roll back to a release containing social resolver/proxy or remote-script execution.

Known limitations: Audio Transcriber is unavailable in zero-cost production; QR remains external; production pages still require inline styles; and deployed headers/CDN behavior require post-deployment checks.
