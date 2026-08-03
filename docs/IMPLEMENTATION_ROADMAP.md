# PanUtility-Web implementation roadmap

## P0-C status — 2026-08-03

Deterministic deployment-readiness work is implemented. Actual Vercel verification is pending owner deployment access, so P0-C remains Partial. Production now fails closed without shared rate limiting, uses Vercel-compatible upload limits, validates environment/origin/client identity, exposes safe health/readiness, verifies production CSP/cache behavior, aligns transcription UI, and includes CI plus a post-deployment verifier. P1 has not started.

## P0-B status — 2026-08-03

API security hardening is implemented: remote code execution and unofficial social providers were removed; social resolver/proxy endpoints and the catalog tool are disabled; transcription is upload-only, bounded, rate-limited, origin/method controlled, timed out, and safely logged; structured errors, security headers, fail-closed URL/DNS/IP/redirect utilities, and deterministic security tests are present. Remaining production work is deployment-level shared rate-limit storage and operational verification, followed by the existing P1 roadmap.

## Milestone status — 2026-08-03

**P0-A is complete:** truthful catalog states, typed capability metadata, unavailable route guards, privacy labels/consent, portable scripts, cleanup, deterministic registry/component/regression/smoke coverage, lazy loading, and registry-generated sitemap are implemented and verified. The 113 route IDs are unchanged. Video splitter repair and the full server security rewrite were explicitly excluded.

**Next recommended milestone: P0-B API security.** Address SSRF and redirect rebinding, proxy constraints, remote JavaScript execution, authentication/rate limits/quotas/origin policy, safe errors, request/provider bounds, secrets, logging, and deterministic abuse/security tests. Keep `video-splitter` disabled unless a separate real media-pipeline milestone is approved.

This roadmap follows the requested priority model. It does not authorize or include fixes; it orders the work established by the audit. A tool should not be promoted from “unavailable” until its primary output is verified from bytes/content, not just UI state.

## P0 — build-breaking, data-loss, security, completely broken tools

1. **Stop false production availability immediately.** Add a maturity/capability flag to the catalog and hide or explicitly disable all 51 UI-only and 17 broken routes. Remove fake success messages. Correct global offline/zero-upload/security claims for transcription, QR, and social tools before further promotion.
2. **Replace video byte slicing.** Use a real demux/remux/transcode pipeline (for example a carefully isolated WebCodecs/MP4Box/ffmpeg strategy) that cuts on valid samples/keyframes and produces a verified playable file. Do not retain byte-ratio slicing as fallback or batch behavior. Add output decode/playback verification.
3. **Lock down server-side fetching.** Make URL validation fail closed; normalize URLs; resolve and validate every address; reject all private, loopback, link-local, multicast, documentation, carrier-grade NAT, metadata, and reserved IPv4/IPv6 ranges; block credentials/unusual ports as appropriate; disable or manually validate redirects; use domain allowlists wherever possible.
4. **Constrain the media proxy.** Accept only short-lived signed resolver results, approved schemes/hosts/MIME types, enforce connect/read/total timeouts and byte limits, control redirects, add abort handling/range strategy, and remove wildcard CORS unless justified.
5. **Protect APIs.** Add rate limits, abuse controls, request/body/audio-duration limits, quotas/budgets for Gemini, origin policy, structured safe errors, observability, and secrets hygiene. Remove stack traces from responses.
6. **Remove remote code execution.** Eliminate SaveFrom/YouTube JavaScript execution in Node `vm`. Use maintained APIs/libraries or a separately sandboxed service with a narrow data contract. Review the legality and platform terms of social downloading before relaunch.
7. **Remove production diagnostics.** Delete or deployment-exclude `api/test.ts` and all manual network probes/player dumps from production paths. Rotate/review `YOUTUBE_COOKIE` if it has ever been used outside a protected environment.
8. **Fix security-misleading tools.** Replace `Function(...)` in scientific calculator with a real expression parser; use Web Crypto/`crypto.getRandomValues` for password generation; implement real named cryptographic hashes or rename the hash tool; remove fabricated EXIF, currency, BMR, step, and other health/finance outputs.
9. **Resolve build/type-check portability.** Move/rename the repository directory or stop relying on npm `.bin` shims that break on `&`; make scripts cross-platform; add focused `tsconfig` include/exclude; remove generated player JS from the compilation/repository; make production build run type-check before bundling.
10. **Establish a P0 verification gate.** Add deterministic tests for SSRF/redirect bypasses, proxy limits, auth/rate limits, API error redaction, video output validity, scientific expression safety, password entropy source, and every route labeled functional. CI must run type-check, lint, tests, and production build.

Exit criteria: no fake success on production routes; no arbitrary server fetch/relay or remote JS execution; the splitter emits independently playable verified media; secrets/cost endpoints are protected; clean cross-platform type-check and build; P0 tests run in CI.

## P1 — partially functional tools and major UX issues

1. **Define a tool contract.** For each catalog item encode maturity, accepted MIME/extensions, output MIME/extensions, client/server/external mode, privacy disclosure, size limits, browser requirements, and state model. Generate UI copy and inventory tests from this contract.
2. **Complete or narrow partial dedicated tools.**
   - Audio trimmer: emit a `.wav` filename for WAV bytes or implement a real MP3 encoder; validate range and output decode.
   - Audio transcriber: correct MediaRecorder MIME handling; explicit upload consent; size/duration/language controls; robust TXT/SRT parsing; retry/cancel.
   - Image converter/PDF compiler/color extractor: size/pixel/count limits, capability checks, worker/off-main-thread processing, transparent/animated/vector warnings, cancellation, and deterministic downloads.
   - QR generator: prefer local generation; if external remains, obtain consent and document data sharing.
   - Social downloader: only if legally approved and reliable providers/formats can be verified; bind real progress to transfer state.
3. **Finish or rename partially implemented generic media tools.** GIF maker, video-to-audio (currently WAV), frame extractor, image compressor, meme generator, filters, resizer, ASCII converter, CSV/JSON conversion, Markdown conversion, noise, breathing, Pomodoro, habit/water tools, and games must match their names and formats.
4. **Implement robust parsers rather than regex/split approximations.** Use established CSV, Markdown, YAML, XML, SQL, cron, JWT, and expression parsers with safe output handling and malformed-input tests.
5. **Complete the useful text/calculator tools.** Handle Unicode graphemes, Base64URL/Unicode, invalid percent escapes, numeric finite/range/zero cases, calendar-accurate age, loan edge cases, GPA scale variants, and clear precision/assumption labels.
6. **Create a consistent state system.** Every tool needs explicit empty, validating, loading/progress, cancellable, success-with-verified-output, partial failure, recoverable error, unsupported-browser/format, and reset states. Never infer success from a timer.
7. **Mobile and accessibility pass.** Minimum touch targets/readable text, responsive single-column workspaces, touch/keyboard pin reordering, accessible names, focus management, live regions, reduced motion, non-color status cues, canvas alternatives, and low-memory warnings. Test representative iOS Safari and Android Chrome codecs/memory.
8. **Privacy UX.** Per-tool “processed locally” or “sent to …” badge derived from the tool contract; consent before upload/external calls; links to privacy/retention terms; clear private-file warning for URLs and cookies.
9. **Add functional coverage.** Unit tests for algorithms/parsers, component state tests for all outcomes, API contract tests with mocked upstreams, and Playwright flows for upload/process/download on each enabled route.

Exit criteria: every visible tool matches its claim and output format; all input/error states are actionable; mobile/keyboard/screen-reader paths work; external processing is disclosed; enabled routes have automated happy-path and failure-path tests.

## P2 — performance, architecture, and maintainability

1. Split `GenericUtilityWorkspace.tsx` into domain packages and one component per real tool; remove category-wide placeholder templates. Extract shared `FileDropzone`, validation, job state, download, progress, logging, and media capability modules.
2. Split `App.tsx` into router/shell/dashboard/search/favorites/keyboard modules. Replace string `ToolId` with a literal union or schema-derived type and make route/component lookup exhaustive.
3. Add route-level lazy loading and sensible manual chunks. Load jsPDF, gifshot, media engines, icon subsets, and heavy workspaces only when needed. Set a bundle budget below the current 1.26 MB main chunk and enforce it in CI.
4. Move CPU-heavy canvas/audio/media work into Web Workers where APIs permit; stream/chunk rather than base64/full-buffer; cap dimensions/files/duration; clean up all AudioContexts, streams, timers, listeners, and object URLs on replacement/unmount.
5. Consolidate duplicated video/audio timeline, batch job, toast, console, and download code. Model jobs with a reducer/state machine to prevent impossible states and timer races.
6. Introduce strict TypeScript incrementally (`strict`, safer indexed access, typed API schemas, no response `any`) and real ESLint/formatting rules. Keep generated fixtures outside `src` and excluded from TypeScript.
7. Separate local Express and Vercel deployment contracts or converge them behind tested adapters. Add health/readiness checks, structured logs with request IDs and redaction, metrics for provider failures/latency/cost, and documented timeouts.
8. Normalize UTF-8 source and repair mojibake. Add an encoding check.
9. Audit dependencies, place build-only packages in dev dependencies, remove unused/template packages/assets, pin/update intentionally, and add dependency/license/security scanning.
10. Replace manual root probes with mocked integration fixtures under a test directory; keep any opt-in live provider smoke tests isolated, secret-safe, rate-limited, and excluded from default CI.

Exit criteria: domain-sized components, exhaustive typed registry, lazy-loaded bundle within budget, bounded background processing, strict type/lint gates, consistent deployment behavior, and maintainable deterministic tests.

## P3 — SEO, content, and growth

1. Publish only verified tools. Generate sitemap entries from the enabled tool registry; remove nonexistent `/tools/whiteboard`; keep canonical production domain and `lastmod` accurate.
2. Add crawlable per-tool rendering (SSR/prerender/static route pages), unique titles/descriptions, canonical URLs, Open Graph/Twitter cards, valid structured data, favicon/manifest, and meaningful internal links.
3. Rewrite claims to be precise: supported formats/browser limitations, local vs server/external processing, file limits, output semantics, privacy, and provider availability. Do not use “secure,” “offline,” “GPU,” “lossless,” or “zero upload” without evidence.
4. Add concise tool instructions, examples, limitations, troubleshooting, privacy/terms/copyright guidance, and accessible FAQs. Health/finance tools need assumptions and non-professional-advice disclaimers.
5. Add privacy-respecting analytics only after consent and a measurement plan. Track route discovery, validation failures, verified completion, download success where observable, provider failure, performance, and mobile abandonment—never file contents or sensitive URLs.
6. Build content/growth experiments around the small set of verified tools first; measure Core Web Vitals and structured-data/search-console errors; expand the catalog only when implementation and test gates pass.

Exit criteria: sitemap and metadata reflect only real routes, pages are crawlable and truthful, privacy/legal content is present, performance is monitored, and growth metrics measure verified value rather than button clicks.
