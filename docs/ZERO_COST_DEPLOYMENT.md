# Zero-cost production deployment

PanUtility-Web can run on Vercel's free plan with no database, Redis, Gemini key, paid API, paid hosting, custom domain, or production secret. Browser-local tools remain available.

Audio Transcriber is deliberately disabled in this mode. Its route remains stable but is non-indexable, has no executable component, and returns structured `410 FEATURE_DISABLED` from `/api/transcribe`. Health and readiness report the browser-tool deployment as ready.

Deploy the repository through Vercel, leave environment variables unset, and use the generated `*.vercel.app` address. `ALLOWED_ORIGINS` defaults safely to `https://panutility.vercel.app`; configure it only for an explicit HTTPS deployment origin. Never enable `ENABLE_TRANSCRIPTION` in production.

Re-enable transcription only in a separately reviewed milestone after adding a server provider key, shared global rate limiting, an identity secret, exact allowed origins, operational monitoring, and deployment verification. Do not substitute a per-instance production limiter.
