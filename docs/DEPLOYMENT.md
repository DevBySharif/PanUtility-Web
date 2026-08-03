# Production deployment

## Vercel contract

Node 22 is the supported deployment baseline. Vercel routes `/api/*` to `api/index.ts`, rewrites `/tools/*` to the SPA, serves existing static files normally, and leaves unrelated page paths as 404. The function duration is 30 seconds; Gemini's application timeout is 20 seconds. Vercel's documented function request-body ceiling is 4.5 MB, so PanUtility limits JSON to 4.25 MiB and decoded audio to 3 MiB.

## Zero-cost production variables

- No secret or paid service is required. Deploy on Vercel's free plan with the repository's default build settings.
- `ALLOWED_ORIGINS` is optional; it defaults to the canonical `https://panutility.vercel.app`. If set, it must contain comma-separated exact HTTPS origins.
- `NODE_ENV`, `VERCEL`, and `VERCEL_ENV` are platform values validated when used.

Do not add wildcards or arbitrary `*.vercel.app` origins. Audio transcription is disabled in every zero-cost production or preview deployment; no Gemini or Redis environment values are needed.

## Procedure

1. Import the Git repository into Vercel's free plan; no custom domain is required.
2. Leave production environment variables unset unless an exact custom HTTPS origin is needed.
3. Deploy using Vercel's npm lockfile detection and `npm run build`.
4. Confirm `/api/readiness` returns 200 without contacting a provider.
5. Run `npm run verify:deployment -- --base-url=https://deployment.example --allowed-origin=https://production-origin.example`.
6. Review the concise verification table before promotion.

GitHub Actions installs from the lockfile, typechecks, lints, runs 112 deterministic tests, independently builds client/server, checks sitemap consistency, audits dependencies, and runs Playwright against the production Express build. It uses no production secrets or paid providers.
