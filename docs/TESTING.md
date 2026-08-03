# Testing

Use npm from the repository root (on restricted Windows PowerShell, invoke `npm.cmd`).

| Command | Purpose |
|---|---|
| `npm run typecheck` | Strict TypeScript validation |
| `npm run lint` | ESLint for TypeScript, React, and Hooks |
| `npm run test` | 247 deterministic Vitest unit/component, API-security, deployment, P1-A2 SEO, P1-B1 image, and P1-B2 text-tool tests in 16 files |
| `npm run test:e2e` | 14 Playwright Chromium tests against the production Express build |
| `npm run build:client` | Generate registry sitemap, build Vite client, and run build-time static HTML prerenderer (`scripts/prerender.ts`) |
| `npm run build:server` | Build the Express server |
| `npm run check` | Typecheck, lint, Vitest, then production build |

Tests do not contact Gemini, SaveFrom, Cobalt, YouTube, QRServer, or other external providers. Playwright starts the local development server and covers catalog/search, all four maturity states, direct and unknown routes, theme persistence, and browser console errors.

P0-B adds mocked API, SSRF/DNS/redirect, bounded-fetch, rate-limit, origin, error, and redaction coverage. `supertest` exercises the Express app without opening a network listener.

P1-B2 adds deterministic coverage for the shared transform library (`tests/functional-tools.test.tsx`): case converter all modes incl. Unicode/emoji/empty; word counter incl. punctuation-only → 0 words, paragraphs, CJK, large bounded input; lorem determinism/bounds/paragraph separation; line-remover option matrix and Unicode; JSON format/minify/5 MB limit; plus `secureRandom`/`rollDie`. `tests/text-tools-workspace.test.tsx` renders the real `GenericUtilityWorkspace` to verify lorem generate/copy/reset, word-counter live stats, line-remover controls, and case-converter Pascal/kebab buttons. The workspace test mocks `gifshot` and `navigator.clipboard` so no media or clipboard hardware is needed.

Final P0-B verification: 75/75 Vitest and 8/8 Playwright tests pass; typecheck, lint, client/server/combined builds, `check`, and dependency audit pass. The audit reports zero known vulnerabilities.

Zero-cost production coverage verifies the 12/30/51/20 registry totals, disabled non-indexable Audio Transcriber, zero-secret health/readiness, structured transcription 410, no provider invocation, sitemap derivation, and the truthful disabled route. Run a build before Playwright because its stable server uses `server-dist/server.cjs`. Post-deployment verification is `npm run verify:deployment -- --base-url=https://...` and never invokes Gemini.
