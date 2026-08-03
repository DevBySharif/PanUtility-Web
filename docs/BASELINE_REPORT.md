# P0-A baseline report

Date: 2026-08-03. This milestone establishes a truthful catalog, portable verification, guarded unavailable routes, initial lazy loading, and accurate processing disclosures. It does not perform P0-B API hardening, repair the video splitter, or add tools.

## 1. Original state

The site exposed 113 routes as though usable. The audit found 12 functional, 32 partial, 51 UI-only, and 18 broken/unsafe tools; unavailable routes could mount a generic workspace with simulated progress, canned output, invalid files, or fabricated calculations. Global copy overstated local/offline/privacy behavior. The main bundle was 1,261.05 kB minified / 365.26 kB gzip.

## 2. Files removed

`1783950531040-player-script.js`, `1783950531047-player-script.js`, `1783950542806-player-script.js`, `1783950542814-player-script.js`, `1783971825014-player-script.js`, `1783971825032-player-script.js`, `test_bochil.js`, `test_social.js`, `test_ytdl.js`, `test_savefrom_self.js`, `log_formats.js`, `api/test.ts`, and stale template `metadata.json`.

## 3–6. Exact tool states

Totals: **12 functional, 32 beta, 51 coming soon, 18 disabled = 113 unique routes**.

Functional (12): `image-converter`, `color-extractor`, `pdf-compiler`, `case-converter`, `word-counter`, `lorem-ipsum`, `line-remover`, `json-formatter`, `percent-calc`, `tip-calc`, `dice-roller`, `rock-paper-scissors`.

Beta (32): `social-downloader`, `gif-maker`, `video-to-audio`, `frame-extractor`, `image-compressor`, `meme-generator`, `image-filters`, `image-resizer`, `ascii-art`, `csv-to-json`, `json-to-csv`, `markdown-to-html`, `audio-trimmer`, `audio-transcriber`, `morse-translator`, `binary-translator`, `base64-coder`, `url-coder`, `html-entities`, `text-reverser`, `qr-generator`, `unit-converter`, `gpa-calc`, `age-calc`, `loan-calc`, `bmi-calc`, `noise-maker`, `breath-guide`, `pomodoro`, `habit-tracker`, `water-tracker`, `coin-flipper`.

Coming soon (51): `video-compressor`, `video-looper`, `subtitles-editor`, `image-cropper`, `pixel-art`, `svg-optimizer`, `gradient-generator`, `pdf-to-txt`, `txt-to-pdf`, `pdf-splitter`, `epub-to-pdf`, `pdf-merger`, `pdf-rotator`, `sound-recorder`, `audio-merger`, `voice-changer`, `audio-speed`, `bpm-finder`, `metronome`, `audio-converter`, `text-diff`, `markdown-editor`, `regex-tester`, `slug-generator`, `text-sorter`, `find-replace`, `sentence-generator`, `uuid-generator`, `xml-beautifier`, `jwt-debugger`, `sql-formatter`, `cron-parser`, `port-scanner`, `color-blender`, `contrast-checker`, `base-converter`, `user-agent`, `mock-api`, `matrix-calc`, `binary-math`, `fibonacci-gen`, `calorie-counter`, `planner`, `sleep-calculator`, `tic-tac-toe`, `name-picker`, `love-calculator`, `trivia-quiz`, `reaction-test`, `anagram-solver`, `sudoku-solver`.

Disabled (18):

- `video-splitter` — byte slicing can create invalid video files.
- `video-speed`, `video-muter`, `video-rotator` — preview changes were falsely presented as exported files.
- `video-resizer`, `video-watermark` — no valid output implementation.
- `exif-viewer` — fabricated metadata.
- `favicon-generator` — PNG bytes falsely labeled ICO.
- `excel-to-csv` — no Excel parser/valid CSV conversion.
- `vocal-remover`, `silence-remover` — advertised audio processing not implemented.
- `hash-generator` — non-cryptographic values mislabeled as cryptographic hashes.
- `yaml-to-json` — fabricated parser output.
- `scientific-calc` — executed user input as JavaScript.
- `currency-converter` — fabricated exchange rates.
- `bmr-calc`, `step-sim` — fabricated health results.
- `password-gen` — `Math.random` contradicted the secure-password claim.

## 7–10. Registry, scripts, and tests

Registry tests verify 113 unique IDs, route resolution, state/processing enums, unavailable feature/index/component guards, disabled reasons, and mandatory privacy notices. Scripts now include `dev`, independent `build:client`/`build:server`, orchestrated `build`, `start`, `preview`, `clean` via rimraf, `typecheck`, real `lint`, `test`, `test:watch`, `test:e2e`, and ordered `check`.

Added test files: `tests/registry.test.ts`, `tests/availability.test.tsx`, `tests/regression.test.tsx`, `tests/functional-tools.test.tsx`, `tests/e2e/catalog.spec.ts`, and `tests/setup.ts`. Vitest contains **33 tests in 4 files**. Playwright contains **8 tests in 1 file**.

## 11–16. Verification and bundles

Final exact command results are recorded in `PROJECT_AUDIT.md`. The client build emits 45 sitemap URLs: the root plus 44 indexable functional/beta tools. The original main entry was **1,261.05 kB / 365.26 kB gzip**; after lazy loading it is **639.00 kB / 177.11 kB gzip**, a reduction of **622.05 kB (49.3%) / 188.15 kB gzip (51.5%)**.

Major lazy chunks: PDF compiler 406.29/133.42 kB gzip; html2canvas 202.38/48.04; jsPDF support 159.75/53.60; generic workspace 105.03/29.52; audio transcriber 22.77/7.33; audio trimmer 19.22/5.84; image converter 13.59/4.37; social downloader 12.43/4.21; QR generator 7.03/2.37; color extractor 6.57/2.63. The main entry decreased, although Vite's >500 kB warning remains.

## 17. Unresolved risks

P0-A intentionally leaves the audited API risks unresolved: SSRF/redirect validation gaps, unconstrained proxying, remote JavaScript execution in resolver logic, missing auth/rate limits/quotas/origin controls, unsafe error detail, provider reliability/legal constraints, and incomplete request/upstream bounds. Beta tools still require deeper correctness, output-format, mobile, accessibility, and state testing.

## 18. Recommended P0-B

Harden or disable server endpoints: fail-closed URL/IP/redirect validation, allowlists, proxy byte/time/MIME limits, remove remote JS execution, safe structured errors, authentication/rate limits/quotas/origin policy, provider mocks and abuse/security tests, and secret/observability controls. The video splitter should remain disabled until a real independently playable media pipeline is separately scoped.

