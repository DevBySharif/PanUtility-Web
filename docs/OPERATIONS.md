# Operations

## Health and readiness

`GET /api/health` confirms only that the API process responds. `GET /api/readiness` checks whether transcription and its shared rate-limit store are configured/reachable; it never calls Gemini or returns credentials, URLs, versions, IPs, or infrastructure details. Both are lightweight and `no-store`.

## Rate limits and privacy

Transcription permits five requests per privacy-safe HMAC identity per 15 minutes. Vercel's overwritten `x-vercel-forwarded-for` value is accepted only as a single valid IP; arbitrary `X-Forwarded-For` is ignored. Local Express uses the socket address. Redis keys contain endpoint names and keyed hashes, never raw IPs. Shared-store timeout or missing production configuration fails closed with `SERVICE_UNAVAILABLE`.

## Logs and incidents

Logs contain request ID, route without query, method, status, duration, provider name/latency, and normalized error code. Never log audio/Base64, raw IPs, origins containing private data, cookies, authorization, Redis credentials, Gemini keys, or upstream bodies.

If a Gemini key may be exposed: disable or delete `GEMINI_API_KEY` immediately, redeploy, revoke the key in Google Cloud/AI Studio, review request IDs and quota activity, issue a replacement only after cause analysis, then verify readiness and deployment checks. To disable transcription quickly, remove `GEMINI_API_KEY` or the shared limiter configuration; the endpoint returns controlled 503 while browser-only tools remain available.

## Rollback

Use Vercel's deployment history to promote the last verified deployment. Restore environment variables only from the protected production environment, then run the deployment verifier. Do not roll back to a release containing social resolver/proxy or remote-script execution.

Known limitations: shared-store availability is required for transcription; Gemini request cancellation is SDK-dependent; codec signatures are not full decoding/duration analysis; production pages still require inline styles; QR remains external; deployed headers/CDN behavior require post-deployment checks.

