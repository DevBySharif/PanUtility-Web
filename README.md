# PanUtility-Web

PanUtility is a React/Vite utility catalog with 113 stable route IDs. P0-A introduces truthful maturity states: functional, beta, coming soon, and temporarily unavailable. Tool pages disclose whether processing happens in the browser, on PanUtility’s server, or through an external provider.

## Requirements

- Node.js 22 or newer
- npm (the repository uses `package-lock.json`)

## Local development

```sh
npm install
npm run dev
```

Copy `.env.example` to `.env.local` only when testing server-backed transcription. Local development uses a bounded in-memory limiter. Production transcription requires Gemini, an explicitly allowed production origin, shared Redis REST configuration, and a 32+ character identity-hashing secret; it fails closed when those controls are absent. Never expose server secrets to client code.

## Verification

```sh
npm run clean
npm run typecheck
npm run lint
npm run test
npm run build:client
npm run build:server
npm run build
npm run test:e2e
npm run check
npm run verify:deployment -- --base-url=https://your-deployment.example
```

`npm run check` runs typecheck, ESLint, Vitest, and the production build in that order. Playwright remains separate because it starts a local server and browser.

## Processing and privacy

- Browser tools show “Processed locally in your browser.”
- Server tools disclose that data is sent to PanUtility’s server.
- External tools disclose that data or URLs are sent to a third-party provider.
- Audio transcription requires confirmation before audio is sent to the server and Google Gemini.
- Production transcription accepts supported audio files up to 3 MiB; Vercel rejects function payloads above 4.5 MB before application code runs.
- QR content is sent to the external QR rendering provider.
- Social downloading is temporarily unavailable because its former unofficial resolver and arbitrary proxy design did not meet the server security policy.

See `docs/PRIVACY_PROCESSING_MATRIX.md`, `docs/TOOL_STATUS_POLICY.md`, and `docs/TESTING.md` for the complete policy and verification model.

Deployment and incident procedures are in `docs/DEPLOYMENT.md` and `docs/OPERATIONS.md`.
