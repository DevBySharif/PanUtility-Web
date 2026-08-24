# PanUtility Full Production, Functionality & Launch Audit

Audit date: 2026-08-25  
Repository audited: `D:\Websites\PanUtility-Web`  
Live production audited: `https://panutility.vercel.app`  
Scope: audit only. No source fixes, commits, pushes, deployments, or social-downloader changes were performed.
Report file only; source code was not modified by this audit.

## 1. Executive Verdict

P1-D remediation verdict on 2026-08-25: **Launch Ready for commit/deployment from the verified local repository state.**

Original audit verdict before P1-D remediation: **Not Launch Ready**

Core production build and most user-facing Functional workflows are in good shape, but launch should be blocked until these items are addressed:

- **P0 security:** `.env.local` is tracked in Git and contains a Vercel OIDC token. The token value is intentionally not repeated here. Remove it from tracking/history as appropriate and rotate/revoke it.
- **P1 SEO/routing:** raw HTML for hidden/unknown tool routes is the homepage HTML with indexable homepage metadata. Hydration corrects the UI, but crawlers that inspect raw HTML do not see truthful noindex/unavailable/not-found metadata.
- **P1 browser runtime:** Functional image/color/PDF workflows trigger CSP console errors because `canvas-confetti` attempts to create a `blob:` worker while production CSP has no `worker-src` and `script-src 'self'`.
- **P1 dependency audit:** `npm audit --json` reports 3 advisories: 1 high, 2 moderate.
- **Verification caveat:** the exact local e2e command was run but blocked by an already-occupied port 3000 after filesystem permission approval. Existing e2e coverage is present, but this audit could not produce a clean local e2e pass from the required command.

The 12 Functional tools all rendered and their core workflows passed live/implementation checks. Three image/document Functional tools are **PASS WITH LIMITATIONS** because of the CSP worker violation and minor accessibility heuristics.

## 2. Repository State

Initial requested safety commands were run.

| Item | Result |
|---|---|
| Branch | `main` |
| HEAD | `69989633a4359a532548d6e087814c002441085a` |
| `origin/main` | `69989633a4359a532548d6e087814c002441085a` |
| Staged files | none |
| Modified files before audit | `index.html`, `scripts/prerender.ts`, `src/App.tsx`, `src/components/GenericUtilityWorkspace.tsx`, `src/components/SeoManager.tsx`, `src/components/Toast.tsx`, `src/index.css`, `tests/e2e/catalog.spec.ts`, `vite.config.ts` |
| Untracked files before audit | `docs/MEDIA_DOWNLOADER_AUDIT.md`, `public/favicon.svg`, `public/og-image.svg`, `public/site.webmanifest` |
| Dirty-tree interpretation | Looks like P1-C in-progress performance/SEO/a11y work: motion removal in app shell, CSS animation replacements, SEO asset updates, mobile overflow e2e test, manual chunks. |
| Git warnings | Git cannot read `C:\Users\Munjir\.config\git\ignore`; non-fatal. |
| Audit-created file | this file only: `docs/FULL_PRODUCTION_AUDIT.md` |

## 3. Tool Registry

Verified from `src/toolsData.ts` through runtime import:

- Total route IDs: **113**
- Unique IDs: **113**
- Functional: **12**
- Beta: **30**
- Coming Soon: **51**
- Disabled: **20**
- Public tools: **12**
- Hidden tools: **101**
- Indexable tools: **12**

Legend: Public = included in public catalog selectors. Indexable = included in sitemap/prerender targets.

| Tool | Route ID | Status | Component | Processing | Public | Indexable | Implementation Found | Audit Result |
|---|---:|---|---|---|---:|---:|---|---|
| Video Splitting & Cutting | video-splitter | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Social Video Downloader | social-downloader | disabled | availability-only | none | No | No | Disabled shell only; old component remains unmounted | Hidden; do not restore |
| GIF Converter & Maker | gif-maker | beta | generic | browser | No | No | Generic beta upload/GIF branch | Prototype/Beta C |
| Video to MP3 Extractor | video-to-audio | beta | generic | browser | No | No | Generic beta branch | Prototype/Beta C |
| Video Frame Grabber | frame-extractor | beta | generic | browser | No | No | Generic beta branch | Prototype/Beta B/C |
| Video Speed Controller | video-speed | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Video Audio Remover | video-muter | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Video Compressor | video-compressor | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Video Looper & Repeater | video-looper | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Video Rotator | video-rotator | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Video Aspect Ratio Resizer | video-resizer | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Video Watermark Adder | video-watermark | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| SRT Subtitle Creator | subtitles-editor | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Image Format Converter | image-converter | functional | image-converter | browser | Yes | Yes | Dedicated component | PASS WITH LIMITATIONS |
| Color Palette Extractor | color-extractor | functional | color-extractor | browser | Yes | Yes | Dedicated component | PASS WITH LIMITATIONS |
| Smart Image Compressor | image-compressor | beta | generic | browser | No | No | Generic canvas branch | Beta B |
| Client-Side Image Cropper | image-cropper | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Aesthetic Meme Generator | meme-generator | beta | generic | browser | No | No | Generic canvas branch | Beta B |
| Interactive Pixel Art Maker | pixel-art | coming-soon | availability-only | none | No | No | Placeholder shell; dead branch exists in generic | Hidden; no mounted processing |
| EXIF Metadata Inspector | exif-viewer | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Favicon & App Icon Generator | favicon-generator | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| SVG Optimizer & Beautifier | svg-optimizer | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| CSS Photo Filters | image-filters | beta | generic | browser | No | No | Generic canvas/filter branch | Beta B |
| Image Dimension Scaler | image-resizer | beta | generic | browser | No | No | Generic canvas/resize branch | Beta B |
| Aesthetic CSS Gradient Designer | gradient-generator | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Image to ASCII Converter | ascii-art | beta | generic | browser | No | No | Generic branch | Beta B/C |
| PDF Compiler (Images to PDF) | pdf-compiler | functional | pdf-compiler | browser | Yes | Yes | Dedicated component | PASS WITH LIMITATIONS |
| PDF to Text Extractor | pdf-to-txt | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Plain Text to PDF Maker | txt-to-pdf | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| PDF Page Splitter | pdf-splitter | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| EPUB to PDF Converter | epub-to-pdf | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| CSV to JSON Structurer | csv-to-json | beta | generic | browser | No | No | Generic parser branch | Beta B |
| Excel to CSV Converter | excel-to-csv | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| PDF File Merger | pdf-merger | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| PDF Page Rotator | pdf-rotator | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| JSON to CSV Converter | json-to-csv | beta | generic | browser | No | No | Generic parser branch | Beta B |
| Markdown to HTML compiler | markdown-to-html | beta | generic | browser | No | No | Generic branch, sanitizer dependency | Beta B |
| Audio Waveform Trimmer | audio-trimmer | beta | audio-trimmer | browser | No | No | Dedicated component | Beta B |
| AI Audio Transcriber | audio-transcriber | disabled | availability-only | none | No | No | Disabled shell; API returns 410 in production | Hidden; zero-cost truthful |
| High-Fidelity Voice Recorder | sound-recorder | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Audio Clip Merger | audio-merger | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Real-Time Voice Modulator | voice-changer | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Vocal Splitter | vocal-remover | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Audio Silence Cutter | silence-remover | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Audio Speed Changer | audio-speed | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Tap Tempo & BPM Counter | bpm-finder | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Rhythm & Tempo Metronome | metronome | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Audio Format Converter | audio-converter | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Text Case Converter | case-converter | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Word & Character Counter | word-counter | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Lorem Ipsum Generator | lorem-ipsum | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Text Diff Checker | text-diff | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Interactive Markdown Editor | markdown-editor | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Interactive RegEx Tester | regex-tester | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| URL Slug & SEO Link Maker | slug-generator | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Alphabetical Line Sorter | text-sorter | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Find & Replace Text Engine | find-replace | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Morse Code Translator | morse-translator | beta | generic | browser | No | No | Generic text branch | Beta A/B |
| Binary to Text Translator | binary-translator | beta | generic | browser | No | No | Generic text branch | Beta A/B |
| Base64 Encoder & Decoder | base64-coder | beta | generic | browser | No | No | Generic text branch | Beta A |
| URL Encoder & Decoder | url-coder | beta | generic | browser | No | No | Generic text branch | Beta A |
| HTML Entity Encoder | html-entities | beta | generic | browser | No | No | Generic text branch | Beta A |
| Text Reverser & Mirror | text-reverser | beta | generic | browser | No | No | Generic text branch | Beta A |
| Duplicate Line Remover | line-remover | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Creative Prompt Generator | sentence-generator | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| QR Code Generator | qr-generator | beta | qr-generator | external | No | No | Dedicated external-provider component | Beta C / privacy risk |
| JSON Beautifier & Validator | json-formatter | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Cryptographic Hash Solver | hash-generator | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| UUID Batch Generator | uuid-generator | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| YAML to JSON Converter | yaml-to-json | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| XML Beautifier & Pretty-Printer | xml-beautifier | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| JSON Web Token (JWT) Parser | jwt-debugger | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| SQL Query Formatter | sql-formatter | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Cron Expression Checker | cron-parser | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Port Ingress Simulator | port-scanner | coming-soon | availability-only | none | No | No | Placeholder shell | Avoid/re-scope |
| HEX Color Blender & Mixer | color-blender | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| WCAG Accessibility Checker | contrast-checker | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Base System Number Converter | base-converter | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| User Agent Inspector | user-agent | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Mock API Response Builder | mock-api | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Scientific Algebra Calculator | scientific-calc | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Universal Unit Converter | unit-converter | beta | generic | browser | No | No | Generic calculator branch | Beta A/B |
| Universal Currency Rates | currency-converter | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Percentage Calculator | percent-calc | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Friendly Bill & Tip Splitter | tip-calc | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Academic GPA Calculator | gpa-calc | beta | generic | browser | No | No | Generic calculator branch | Beta B |
| Age & Millisecond Calculator | age-calc | beta | generic | browser | No | No | Generic calculator branch | Beta B |
| Amortization & Loan Planner | loan-calc | beta | generic | browser | No | No | Generic calculator branch | Beta B |
| Matrix Algebra Solver | matrix-calc | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Binary Mathematics Solver | binary-math | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Fibonacci Sequence Solver | fibonacci-gen | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| BMI Healthy Weight Solver | bmi-calc | beta | generic | browser | No | No | Generic calculator branch | Beta B |
| BMR Energy Estimator | bmr-calc | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Calorie Tracker & Food Diary | calorie-counter | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Sleep Aid Ambient Sounds | noise-maker | beta | generic | browser/audio | No | No | Generic audio branch | Beta B |
| Hourly Daily Task Planner | planner | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Symmetrical Box Breathing | breath-guide | beta | generic | browser | No | No | Generic timer branch | Beta A/B |
| Step & Cardio Estimator | step-sim | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Pomodoro Productivity Clock | pomodoro | beta | generic | browser | No | No | Generic timer branch | Beta A/B |
| Daily Streak Habit Tracker | habit-tracker | beta | generic | browser | No | No | Generic state branch | Beta B |
| Daily Water Intake Logger | water-tracker | beta | generic | browser | No | No | Generic state branch | Beta A/B |
| Optimal Sleep Stage Planner | sleep-calculator | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Secure Password Generator | password-gen | disabled | availability-only | none | No | No | Disabled shell only | Hidden; truthful reason |
| Polyhedral Dice Roller | dice-roller | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Coin Flipper & Odds Checker | coin-flipper | beta | generic | browser | No | No | Generic Math.random branch | Beta C |
| Rock Paper Scissors vs. Computer | rock-paper-scissors | functional | generic | browser | Yes | Yes | Generic Functional branch | PASS |
| Tic-Tac-Toe Board | tic-tac-toe | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Random Selector Wheel | name-picker | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Compatibility Love Solver | love-calculator | coming-soon | availability-only | none | No | No | Placeholder shell | Avoid/re-scope |
| Offline General Trivia | trivia-quiz | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Reaction Time Tester | reaction-test | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Word Anagram Solver | anagram-solver | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |
| Mini Sudoku Board | sudoku-solver | coming-soon | availability-only | none | No | No | Placeholder shell | Hidden; no processing |

## 4. Functional Tool Matrix

| Tool | Route | Verdict | Inputs | Outputs | Evidence |
|---|---|---|---|---|---|
| Image Format Converter | `/tools/image-converter` | PASS WITH LIMITATIONS | `image/*`; live-tested PNG/JPEG inputs | JPEG/PNG/WebP downloads | Live Chromium produced valid JPEG, PNG, WebP signatures and non-zero files. Limitation: CSP blob-worker console error from confetti; some unlabeled/small controls. |
| Color Palette Extractor | `/tools/color-extractor` | PASS WITH LIMITATIONS | `image/*` | HEX/RGB swatches; percentages in aria labels | Live 40×40 half red/green PNG produced `#ff0000 (50%)` and `#00ff00 (50%)`. Limitation: tiny 2×1 images produce smoothed intermediate swatches due 40×40 downsample. CSP blob-worker error. |
| PDF Compiler | `/tools/pdf-compiler` | PASS WITH LIMITATIONS | `image/*` | PDF download | Live two-image compile produced valid `%PDF` file, 5,314 bytes, two `/Type /Page` markers. Limitation: CSP blob-worker error and small accessibility-control findings. |
| Text Case Converter | `/tools/case-converter` | PASS | text | text | Live PascalCase/kebab-case passed; transform tests cover upper/lower/title/sentence/camel/Pascal/snake/kebab, punctuation, emoji, accents, CJK, empty. |
| Word & Character Counter | `/tools/word-counter` | PASS | text | counts text | Live `One two three\n\nFour five six` returned Words 6, Characters 28, Lines 3, Paragraphs 2, 1 min read. Tests cover whitespace, punctuation, emoji, CJK, empty, large bounded input. |
| Lorem Ipsum Generator | `/tools/lorem-ipsum` | PASS | count | deterministic placeholder text | Live generation produced non-empty Lorem text. Tests verify deterministic behavior, 1..20 clamp, paragraph separation, copy/reset. |
| Duplicate Line Remover | `/tools/line-remover` | PASS | text + trim/remove blank/case options | deduplicated text | Live duplicate removal returned first occurrence order. Tests cover trim on/off, blank lines on/off, case sensitivity, Unicode. |
| JSON Beautifier & Validator | `/tools/json-formatter` | PASS | JSON text up to 5MB safety limit | formatted/minified JSON text | Live format/minify passed. Code uses `JSON.parse`/`JSON.stringify`, no eval. Tests cover object, array, nested, primitives, Unicode, invalid, empty, size boundary. |
| Percentage Calculator | `/tools/percent-calc` | PASS | finite numbers | numeric text result | Live `25% of 200 = 50`; tests cover 0%, 100%, 12.5%, blanks, malformed/non-finite, reset. Negative percent currently allowed by implementation. |
| Friendly Bill & Tip Splitter | `/tools/tip-calc` | PASS | bill, tip %, positive integer people | currency totals | Live Bill 100 / Tip 20 / People 4 showed $20, $120, $30/person. Tests cover decimals, zero tip/bill, fractional people, negative, reset. |
| Polyhedral Dice Roller | `/tools/dice-roller` | PASS | d4/d6/d8/d10/d12/d20 buttons | roll text | Live d6 roll passed. Tests verify all supported dice and range, reset, aria-live. Randomness uses Web Crypto where available + rejection sampling; fallback is Math.random and copy states entertainment/not gambling. |
| Rock Paper Scissors vs. Computer | `/tools/rock-paper-scissors` | PASS | rock/paper/scissors | result and score | Live round passed. Tests verify all nine outcome combinations, score/reset, random opponent copy, no fake AI claim. |

## 5. Functional Failures

No Functional tool had a verified core-output failure.

Functional limitations and reproductions:

1. **CSP blob-worker violation on image/document Functional tools**
   - Affected: `/tools/image-converter`, `/tools/color-extractor`, likely `/tools/pdf-compiler`
   - Repro: open image converter on live production, convert/download an image.
   - Actual: Chromium console reports refused blob worker because CSP has `script-src 'self'` and no `worker-src`.
   - Expected: no CSP violation during normal Functional workflows.
   - Risk: browser runtime noise and possible future feature breakage; security policy and runtime behavior disagree.
   - Recommended fix: disable the confetti worker path or explicitly and intentionally set a narrow `worker-src` policy after review.
   - Priority: P1.

2. **Color Extractor tiny-fixture smoothing**
   - Affected: `/tools/color-extractor`
   - Repro: upload a 2×1 red/green image.
   - Actual: because the component draws to a 40×40 canvas with default smoothing, intermediate colors appear.
   - Expected: a tiny deterministic two-pixel fixture should not generate gradient-like intermediate colors if exact-pixel mode is expected.
   - Risk: non-critical; normal 40×40 half red/green fixture correctly reports two 50% colors.
   - Recommended fix: disable image smoothing for extraction or document sampled/clustered palette behavior.
   - Priority: P2.

## 6. Beta Tool Matrix

Classification:

- A = nearly production ready
- B = substantial work required
- C = prototype/misleading or not recommended as-is

| Beta Tool | Route | Class | Difficulty | Evidence / Missing Behavior |
|---|---|---:|---|---|
| GIF Converter & Maker | `/tools/gif-maker` | C | Hard | Generic branch; likely depends on `gifshot`; needs deterministic GIF decode/page tests, size/perf validation, invalid video/image handling. |
| Video to MP3 Extractor | `/tools/video-to-audio` | C | Hard | Browser video/audio extraction branch is not a verified MP3 encoder; high risk of mislabeled/invalid output. |
| Video Frame Grabber | `/tools/frame-extractor` | B/C | Medium | Browser preview/frame capture branch exists; needs real video fixture, exact frame/time tests, output MIME/signature tests. |
| Smart Image Compressor | `/tools/image-compressor` | B | Medium | Generic image branch likely real canvas output; needs size/quality validation, MIME/signature/download tests. |
| Aesthetic Meme Generator | `/tools/meme-generator` | B | Medium | Generic canvas overlay branch exists; needs text wrapping, mobile, output decode tests. |
| CSS Photo Filters | `/tools/image-filters` | B | Medium | Browser filter preview/output branch exists; needs deterministic pixel and output tests. |
| Image Dimension Scaler | `/tools/image-resizer` | B | Medium | Browser resize branch exists; needs dimension validation and decoded output tests. |
| Image to ASCII Converter | `/tools/ascii-art` | B/C | Medium | Generic output exists but needs exact mapping, large image, copy/download tests. |
| CSV to JSON Structurer | `/tools/csv-to-json` | B | Medium | Generic parser branch exists; likely simple parser, needs quoted commas/newlines/encoding tests. |
| JSON to CSV Converter | `/tools/json-to-csv` | B | Medium | Generic parser branch exists; needs nested/array/escaping tests. |
| Markdown to HTML compiler | `/tools/markdown-to-html` | B | Medium | Generic branch and DOMPurify dependency; npm audit currently flags DOMPurify transitive advisory. Needs XSS fixture tests. |
| Audio Waveform Trimmer | `/tools/audio-trimmer` | B | Hard | Dedicated component exists; needs real audio decode/trim/export validation and browser compatibility matrix. |
| Morse Code Translator | `/tools/morse-translator` | A/B | Easy | Text branch exists; needs punctuation/spacing/international limitations documented. |
| Binary to Text Translator | `/tools/binary-translator` | A/B | Easy | Text branch exists; needs invalid byte, Unicode, spacing tests. |
| Base64 Encoder & Decoder | `/tools/base64-coder` | A | Easy | Text branch exists with safe decode helper; needs browser workflow tests and Unicode round-trip. |
| URL Encoder & Decoder | `/tools/url-coder` | A | Easy | Text branch exists; needs malformed percent sequence tests. |
| HTML Entity Encoder | `/tools/html-entities` | A | Easy | Text branch exists; needs XSS-safe display/copy tests. |
| Text Reverser & Mirror | `/tools/text-reverser` | A | Easy | Text branch exists; needs grapheme cluster/emoji limitations documented. |
| QR Code Generator | `/tools/qr-generator` | C | Medium | Dedicated component uses external `api.qrserver.com`; sends payload in query string. Not aligned with hidden/local-only launch posture unless privacy UX is explicit. |
| Universal Unit Converter | `/tools/unit-converter` | A/B | Easy | Calculator branch exists; needs exhaustive units and rounding tests. |
| Academic GPA Calculator | `/tools/gpa-calc` | B | Medium | Basic calculation branch exists; needs grading-scale validation and reset/error states. |
| Age & Millisecond Calculator | `/tools/age-calc` | B | Medium | Basic date branch exists; needs timezone/date-boundary tests. |
| Amortization & Loan Planner | `/tools/loan-calc` | B | Medium | Basic finance math branch exists; needs formula, rounding, negative/zero tests and finance disclaimer. |
| BMI Healthy Weight Solver | `/tools/bmi-calc` | B | Medium | Health calculator branch exists; needs validation/disclaimer and unit tests. |
| Sleep Aid Ambient Sounds | `/tools/noise-maker` | B | Medium | Browser audio synthesis branch exists; needs cleanup/timer/audio-context tests. |
| Symmetrical Box Breathing | `/tools/breath-guide` | A/B | Easy | Timer/visual branch exists; needs pause/reset/reduced-motion tests. |
| Pomodoro Productivity Clock | `/tools/pomodoro` | A/B | Easy | Timer branch exists; needs timer cleanup, background behavior, notifications truthfulness. |
| Daily Streak Habit Tracker | `/tools/habit-tracker` | B | Medium | Local state branch exists; needs persistence/privacy/empty state tests. |
| Daily Water Intake Logger | `/tools/water-tracker` | A/B | Easy | Local UI branch exists; needs bounds/persistence tests. |
| Coin Flipper & Odds Checker | `/tools/coin-flipper` | C | Easy | Uses `Math.random`, unlike dice/RPS. Could be promoted only after Web Crypto/rejection-sampling parity or clear entertainment copy. |

## 7. Coming Soon Matrix

All 51 Coming Soon routes are `availability-only`, hidden from public catalog and sitemap, and have no mounted processing component. Hydrated direct routes are truthful. Raw direct HTML is still homepage HTML before hydration; see SEO section.

| Coming Soon Tool | Route | Placeholder only? | Feasibility | Recommendation |
|---|---|---:|---|---|
| Video Compressor | `/tools/video-compressor` | Yes | Browser-heavy / server likely | Keep hidden until real media pipeline exists. |
| Video Looper & Repeater | `/tools/video-looper` | Yes | Browser-heavy | Implement only with verified container output. |
| SRT Subtitle Creator | `/tools/subtitles-editor` | Yes | Browser-only | Feasible after text/timeline UX and export tests. |
| Client-Side Image Cropper | `/tools/image-cropper` | Yes | Browser-only | Good future candidate. |
| Interactive Pixel Art Maker | `/tools/pixel-art` | Yes | Browser-only | Feasible; generic dead branch exists but not mounted. |
| SVG Optimizer & Beautifier | `/tools/svg-optimizer` | Yes | Browser-only but security-sensitive | Need safe parser/sanitizer and malicious SVG tests. |
| Aesthetic CSS Gradient Designer | `/tools/gradient-generator` | Yes | Browser-only | Good future candidate. |
| PDF to Text Extractor | `/tools/pdf-to-txt` | Yes | Browser-heavy | Needs PDF parser dependency and fixture tests. |
| Plain Text to PDF Maker | `/tools/txt-to-pdf` | Yes | Browser-only | Feasible with jsPDF, pagination tests. |
| PDF Page Splitter | `/tools/pdf-splitter` | Yes | Browser-heavy | Needs PDF manipulation dependency/tests. |
| EPUB to PDF Converter | `/tools/epub-to-pdf` | Yes | Browser-heavy / avoid initially | Complex rendering; high maintenance. |
| PDF File Merger | `/tools/pdf-merger` | Yes | Browser-heavy | Feasible with deterministic page-count tests. |
| PDF Page Rotator | `/tools/pdf-rotator` | Yes | Browser-heavy | Feasible with PDF tests. |
| High-Fidelity Voice Recorder | `/tools/sound-recorder` | Yes | Browser-only permissioned | Needs mic permission UX/privacy. |
| Audio Clip Merger | `/tools/audio-merger` | Yes | Browser-heavy | Needs real encoding pipeline. |
| Real-Time Voice Modulator | `/tools/voice-changer` | Yes | Browser-heavy | Needs Web Audio QA and privacy copy. |
| Audio Speed Changer | `/tools/audio-speed` | Yes | Browser-heavy | Needs valid export, not preview only. |
| Tap Tempo & BPM Counter | `/tools/bpm-finder` | Yes | Browser-only | Good candidate. |
| Rhythm & Tempo Metronome | `/tools/metronome` | Yes | Browser-only | Good candidate. |
| Audio Format Converter | `/tools/audio-converter` | Yes | Browser-heavy | Requires encoder strategy. |
| Text Diff Checker | `/tools/text-diff` | Yes | Browser-only | Good candidate. |
| Interactive Markdown Editor | `/tools/markdown-editor` | Yes | Browser-only, XSS-sensitive | Needs sanitizer and XSS tests. |
| Interactive RegEx Tester | `/tools/regex-tester` | Yes | Browser-only with ReDoS limits | Add timeout/length limits. |
| URL Slug & SEO Link Maker | `/tools/slug-generator` | Yes | Browser-only | Good candidate. |
| Alphabetical Line Sorter | `/tools/text-sorter` | Yes | Browser-only | Good candidate. |
| Find & Replace Text Engine | `/tools/find-replace` | Yes | Browser-only | Good candidate. |
| Creative Prompt Generator | `/tools/sentence-generator` | Yes | Browser-only | Feasible if deterministic/static. |
| UUID Batch Generator | `/tools/uuid-generator` | Yes | Browser-only | Good candidate using `crypto.randomUUID`. |
| XML Beautifier & Pretty-Printer | `/tools/xml-beautifier` | Yes | Browser-only, parser-sensitive | Use DOMParser safely; no external entities. |
| JSON Web Token (JWT) Parser | `/tools/jwt-debugger` | Yes | Browser-only but security-copy sensitive | Decode only; no fake validation. |
| SQL Query Formatter | `/tools/sql-formatter` | Yes | Browser-only | Needs parser/formatter dependency review. |
| Cron Expression Checker | `/tools/cron-parser` | Yes | Browser-only | Good candidate. |
| Port Ingress Simulator | `/tools/port-scanner` | Yes | Avoid/re-scope | Browser cannot scan arbitrary ports safely/truthfully. |
| HEX Color Blender & Mixer | `/tools/color-blender` | Yes | Browser-only | Good candidate. |
| WCAG Accessibility Checker | `/tools/contrast-checker` | Yes | Browser-only | Good candidate if scope limited to color contrast. |
| Base System Number Converter | `/tools/base-converter` | Yes | Browser-only | Good candidate. |
| User Agent Inspector | `/tools/user-agent` | Yes | Browser-only | Good candidate. |
| Mock API Response Builder | `/tools/mock-api` | Yes | Browser-only | Feasible as static response designer, not hosted API. |
| Matrix Algebra Solver | `/tools/matrix-calc` | Yes | Browser-only | Feasible with validation. |
| Binary Mathematics Solver | `/tools/binary-math` | Yes | Browser-only | Good candidate. |
| Fibonacci Sequence Solver | `/tools/fibonacci-gen` | Yes | Browser-only | Good candidate. |
| Calorie Tracker & Food Diary | `/tools/calorie-counter` | Yes | Browser-only but health/privacy | Needs disclaimer and local-only storage. |
| Hourly Daily Task Planner | `/tools/planner` | Yes | Browser-only | Feasible; persistence/privacy needed. |
| Optimal Sleep Stage Planner | `/tools/sleep-calculator` | Yes | Browser-only, health-copy | Feasible with disclaimer. |
| Tic-Tac-Toe Board | `/tools/tic-tac-toe` | Yes | Browser-only | Good candidate. |
| Random Selector Wheel | `/tools/name-picker` | Yes | Browser-only | Good candidate with local-only copy. |
| Compatibility Love Solver | `/tools/love-calculator` | Yes | Avoid/re-scope | Fabrication risk; keep clearly entertainment-only if built. |
| Offline General Trivia | `/tools/trivia-quiz` | Yes | Browser-only | Feasible with content QA. |
| Reaction Time Tester | `/tools/reaction-test` | Yes | Browser-only | Good candidate. |
| Word Anagram Solver | `/tools/anagram-solver` | Yes | Browser-only but dictionary-heavy | Needs dictionary bundle strategy. |
| Mini Sudoku Board | `/tools/sudoku-solver` | Yes | Browser-only | Good candidate with deterministic solver tests. |

## 8. Disabled Tool Matrix

All 20 Disabled routes are hidden from public catalog/sitemap and hydrate to a disabled availability shell with a reason. Do not restore social-downloader or retired API behavior.

| Disabled Tool | Route | Registry reason / evidence | Future disposition |
|---|---|---|---|
| Video Splitting & Cutting | `/tools/video-splitter` | Previous export could create invalid video files. | Rebuild only with real media pipeline. |
| Social Video Downloader | `/tools/social-downloader` | Unsafe scraping/remote-script/proxy dependency history. | Retain disabled or rebuild only with safe documented provider. |
| Video Speed Controller | `/tools/video-speed` | Preview-only speed changes; no adjusted export. | Rebuild safely or keep disabled. |
| Video Audio Remover | `/tools/video-muter` | Preview-only mute; no muted export. | Rebuild safely. |
| Video Rotator | `/tools/video-rotator` | Preview-only rotation; no rotated export. | Rebuild safely. |
| Video Aspect Ratio Resizer | `/tools/video-resizer` | No valid output. | Rebuild safely. |
| Video Watermark Adder | `/tools/video-watermark` | No valid export. | Rebuild safely. |
| EXIF Metadata Inspector | `/tools/exif-viewer` | Previous metadata was fabricated. | Rebuild with real EXIF parser or remove. |
| Favicon & App Icon Generator | `/tools/favicon-generator` | Previous ICO output mislabeled PNG bytes. | Rebuild with valid ICO/container generation. |
| Excel to CSV Converter | `/tools/excel-to-csv` | Excel parsing not implemented. | Rebuild with SheetJS-like parser after dependency review. |
| AI Audio Transcriber | `/tools/audio-transcriber` | Server transcription unavailable in zero-cost production. API returns 410. | Keep disabled unless paid provider architecture returns. |
| Vocal Splitter | `/tools/vocal-remover` | No real source separation. | Avoid unless ML model/server architecture exists. |
| Audio Silence Cutter | `/tools/silence-remover` | No real silence detection/removal. | Rebuild with waveform tests. |
| Cryptographic Hash Solver | `/tools/hash-generator` | Prior non-cryptographic output mislabeled. | Rebuild with Web Crypto hashes. |
| YAML to JSON Converter | `/tools/yaml-to-json` | Prior output fabricated. | Rebuild with parser and malicious YAML tests. |
| Scientific Algebra Calculator | `/tools/scientific-calc` | Prior implementation executed user input with `Function`. | Rebuild with safe parser only. |
| Universal Currency Rates | `/tools/currency-converter` | Prior exchange rates fabricated. | Avoid zero-cost live rates unless static disclaimer or real API. |
| BMR Energy Estimator | `/tools/bmr-calc` | Prior health calculation fabricated. | Rebuild with formula/disclaimer tests. |
| Step & Cardio Estimator | `/tools/step-sim` | Prior health estimates fabricated. | Rebuild with clear estimate policy. |
| Secure Password Generator | `/tools/password-gen` | Prior Math.random did not meet secure claim. | Rebuild with Web Crypto. |

## 9. Public Visibility

Evidence:

- `PUBLIC_TOOLS` and `INDEXABLE_TOOLS` contain only 12 Functional tools.
- Live homepage hydrated body contains all 12 Functional cards.
- Live homepage did not expose `GIF Converter & Maker`, `Social Video Downloader`, or `Video Compressor`.
- Live sitemap contains 13 URLs: homepage + 12 Functional tools.
- Live sitemap does not include representative hidden routes.
- Existing source selectors use `PUBLIC_TOOLS`/`PUBLIC_TOOL_IDS` for dashboard discovery and drag/drop routing.

Issue:

- Direct hidden routes hydrate truthfully, but raw server HTML is homepage HTML. This is a public-discovery/SEO leak at the raw HTML layer.

## 10. SEO

Functional route raw HTML:

- All 12 Functional route raw HTML probes returned status 200.
- Each had unique title, canonical URL, `robots index, follow`, H1, and JSON-LD.
- Sitemap: 13 URLs and no `panutility.com` legacy domain.
- Robots: `Sitemap: https://panutility.vercel.app/sitemap.xml`.

Hidden/unknown raw HTML issue:

- `/tools/gif-maker`, `/tools/video-compressor`, `/tools/social-downloader`, and `/tools/not-a-real-tool` return status 200 raw homepage HTML with homepage title and no `noindex`.
- Hydrated UI later shows Beta/Coming Soon/Temporarily Unavailable/Tool Not Found correctly.
- Recommended: provide prerendered/noindex hidden route HTML or server-level route handling for hidden/unknown tool paths.

Live vs local caveat:

- Live production still loads older Google Font links including Playfair Display and duplicate Inter declarations.
- The dirty local worktree changes appear to address this, but they are uncommitted and not live.

## 11. Accessibility

Automated heuristic scan at 390×844:

| Path | Unnamed interactive count | Small target count | Unlabeled input count |
|---|---:|---:|---:|
| `/` | 0 | 20 | 0 |
| `/tools/image-converter` | 3 | 6 | 1 |
| `/tools/color-extractor` | 1 | 4 | 1 |
| `/tools/pdf-compiler` | 1 | 3 | 1 |
| `/tools/case-converter` | 0 | 12 | 0 |
| `/tools/word-counter` | 0 | 4 | 0 |
| `/tools/lorem-ipsum` | 1 | 5 | 1 |
| `/tools/line-remover` | 3 | 8 | 0 |
| `/tools/json-formatter` | 0 | 6 | 0 |
| `/tools/percent-calc` | 0 | 3 | 0 |
| `/tools/tip-calc` | 0 | 3 | 0 |
| `/tools/dice-roller` | 0 | 3 | 0 |
| `/tools/rock-paper-scissors` | 0 | 3 | 0 |

WCAG-relevant findings:

- P1/P2: several small touch targets under 32px, especially icon-only controls and compact shortcut UI.
- P1/P2: some hidden file inputs or icon controls are detected as unlabeled/unnamed by heuristic scanning. Visible drop zones often have aria labels, so manual review is required before ticketing each control.
- Positive: calculator/game result regions use `aria-live="polite"` in tests; many buttons have accessible labels.

## 12. Mobile

Live Chromium audit covered requested viewport sizes:

- 320×568
- 360×800
- 375×812
- 390×844
- 412×915
- 768×1024

Routes checked: homepage + all 12 Functional routes.

Result: **no horizontal overflow detected** on the checked routes/sizes.

Remaining mobile risks:

- Long filenames and very long JSON output should get deeper manual testing beyond overflow checks.
- Small target counts above should be addressed before a polished launch.

## 13. Security

Positive evidence:

- Active source scan found no `eval(`, `Function(`, `vm.Script`, or `runInContext` in active source paths.
- Old dangerous references remain in documentation only.
- `/api/health` live returns 200 JSON with `Cache-Control: no-store`.
- `/api/readiness` live returns 200 JSON.
- `/api/transcribe`, `/api/resolve-social`, and `/api/media-proxy` return structured 410 in zero-cost production.
- Unknown API route returns structured 404.
- Live server source maps return 404 for `/server.cjs.map`, `/server-dist/server.cjs.map`, and tested client `.map`.
- Production CSP uses `script-src 'self'`, no `unsafe-eval`, `object-src 'none'`, `base-uri 'self'`, and `frame-ancestors 'none'`.
- HSTS, nosniff, referrer policy, permissions policy, and no-store API caching are present.

Security blockers/risks:

- **P0:** `.env.local` is tracked and contains a Vercel OIDC token. The token must be rotated/revoked and the file removed from tracking/history as appropriate. `.gitignore` already lists `.env.local`, but that does not untrack an already committed file.
- **P1:** CSP blocks a blob worker during normal image/color workflows. Either runtime code or CSP must be brought into alignment.
- X-Frame-Options header is absent; CSP `frame-ancestors 'none'` provides modern frame protection. Add XFO only if legacy browser policy requires it.

## 14. Privacy

Functional tools:

- All 12 Functional tools process browser-side based on registry and observed behavior.
- Live Functional workflows did not call application APIs except page/static assets.
- Image/PDF/user text remains local in the browser for Functional tools.

Third-party requests observed:

- Google Fonts CSS and `fonts.gstatic.com` font files are requested on live production.
- No analytics/tracking scripts observed.
- QR provider `https://api.qrserver.com` is allowed by CSP and used by hidden Beta QR tool, but QR is not public/indexable.
- Unsplash is allowed by CSP for images, but no live Functional route required it in tested workflows.

Privacy risks:

- QR Beta sends user content in URL query to a third party.
- Tracked `.env.local` secret is a security issue, not a user-data processing issue, but it affects operational privacy/security posture.

## 15. Performance

Local lab build result from dirty worktree:

- Sitemap generated: 13 URLs.
- Prerendered: homepage + 12 Functional tool pages.
- Main CSS: `94.88 kB` / `14.48 kB gzip`.
- Main JS chunks included:
  - `index-CpA9Jo3I.js`: `190.55 kB` / `46.61 kB gzip`
  - `react-DN6JapyF.js`: `193.94 kB` / `60.60 kB gzip`
  - `PdfCompiler-DutlXk9C.js`: `409.66 kB` / `134.57 kB gzip`
  - `html2canvas.esm-QH1iLAAe.js`: `202.38 kB` / `48.04 kB gzip`
  - `vector-canvas-DPwLMeoP.js`: `159.71 kB` / `53.62 kB gzip`
  - `motion-BK69_P5w.js`: `128.78 kB` / `42.34 kB gzip`
  - `GenericUtilityWorkspace-B1l3TZH4.js`: `120.46 kB` / `33.47 kB gzip`

Live production resource timing lab probes:

| Route | Requests | Resource transfer | Largest live resource |
|---|---:|---:|---|
| `/` | 5 | 202,217 bytes | `index-D5PHF_YB.js` ~184,771 transfer bytes |
| `/tools/image-converter` | 12 | 13,210 bytes incremental/cached | image converter chunk + confetti/imageTools |
| `/tools/pdf-compiler` | 12 | 136,808 bytes incremental/cached | `PdfCompiler-DCxez21y.js` ~136,808 transfer bytes |
| `/tools/json-formatter` | 12 | 37,869 bytes incremental/cached | `GenericUtilityWorkspace-DgafEtKi.js` ~34,457 transfer bytes |

Performance notes:

- Lighthouse is not installed in this repo; no Lighthouse score is claimed.
- Live production differs from local dirty build assets/hashes.
- PDF compiler is the largest route chunk.
- Live production still has duplicate/older Google Fonts requests; dirty local worktree appears to reduce this.

## 16. Dependencies

`npm.cmd audit --json` result after approval:

| Severity | Count |
|---|---:|
| Critical | 0 |
| High | 1 |
| Moderate | 2 |
| Low | 0 |
| Total | 3 |

Advisories:

| Package | Severity | Direct? | Fix available | Notes |
|---|---|---:|---:|---|
| `nanoid` | High | No | Yes | Transitive. Advisory: custom/non-secure generators can loop indefinitely. |
| `dompurify` | Moderate | No | Yes | Transitive. XSS-related advisory in affected range. Relevant to Markdown/HTML-style Beta surfaces. |
| `postcss` | Moderate | Yes | Yes | Direct dev/build dependency. Source-map/path disclosure advisory. |

No `npm audit fix` was run.

## 17. Automated Tests

Required commands and outcomes:

| Command | Exit | Result |
|---|---:|---|
| `npm.cmd install` | 1 then 0 | First blocked by EPERM on `package-lock.json`; approved rerun succeeded, audited 586 packages, reported 3 vulnerabilities. |
| `npm.cmd run clean` | 1 then 0 | First blocked by EPERM deleting `test-results/.last-run.json`; approved rerun succeeded. |
| `npm.cmd run typecheck` | 0 | Passed. |
| `npm.cmd run lint` | 0 | Passed. |
| `npm.cmd run test` | 1 then 0 | First blocked by EPERM writing Vite temp config; approved rerun passed: 17 files, 275 tests. |
| `npm.cmd run build:client` | 1 then 0 | First blocked by EPERM writing `public/sitemap.xml`; approved rerun passed, sitemap 13, Vite build, prerender 13 pages. |
| `npm.cmd run build:server` | 1 then 0 | First blocked by EPERM creating `server-dist`; approved rerun passed. |
| `npm.cmd run build` | 1 then 0 | First blocked by EPERM writing sitemap; approved rerun passed, client + server. |
| `npm.cmd run test:e2e` | 1 then 1 | First blocked by EPERM creating `test-results`; approved rerun blocked because `http://127.0.0.1:3000` was already used. Stop-process was not performed because PID ownership could not be verified. |
| `npm.cmd run check` | 1 then 0 | First blocked by EPERM writing Vite temp config; approved rerun passed: 17 files, 275 tests + production build. |
| `npm.cmd audit --json` | 1 then 1 | First failed advisory endpoint/log write; approved rerun returned valid JSON with 3 vulnerabilities. npm exits 1 when advisories exist. |

Existing test coverage:

- Registry tests verify 113 IDs and status totals.
- Functional tests cover image validation, color math, PDF geometry, text transforms, calculators, games, random bounds, security API, SEO, build scripts, Vercel config.
- E2E file defines 22 tests, including public-only catalog, hidden routes, functional interactions, mobile overflow, CSP, cache/source-map checks.
- This audit could not complete the exact e2e command because of local port conflict.

## 18. Live Production

Project verifier:

`npm.cmd run verify:deployment -- --base-url=https://panutility.vercel.app`

Result: passed after network approval.

Passed checks:

- homepage
- direct tool SPA
- hashed asset
- unknown page 404
- unknown API
- `/api/resolve-social` disabled
- `/api/media-proxy` disabled
- transcription disabled
- health
- readiness
- production CSP
- security headers
- HTML cache
- allowed CORS
- rejected CORS
- sitemap
- robots

Independent live probes:

- `/api/health`: 200 JSON, no-store
- `/api/readiness`: 200 JSON, no-store
- `/api/transcribe`: structured 410
- `/api/resolve-social`: structured 410
- `/api/media-proxy`: structured 410
- `/api/nope`: structured 404
- Sitemap count: 13
- Public server/source maps: 404
- Static assets: immutable cache
- Homepage HTML cache: `public, max-age=0, must-revalidate`
- All Functional routes: 200 raw HTML, unique title/canonical/index metadata and visible hydrated heading.
- Hidden hydrated routes: truthful UI after JS hydration.
- Hidden raw routes: homepage HTML/no noindex, launch issue.

## 19. Launch Blockers

### P0 — Launch Blocker

| Issue | Evidence | Repro | Expected | Actual | Recommended fix | Risk | Effort |
|---|---|---|---|---|---|---|---|
| Tracked `.env.local` contains Vercel OIDC token | `git ls-files` shows `.env.local`; file contains `VERCEL_OIDC_TOKEN` | `git ls-files \| rg "\.env"` then inspect `.env.local` | No secret-bearing env files tracked | Secret-bearing env file is tracked | Rotate/revoke token, remove file from tracking/history as appropriate, keep `.env.local` ignored | Credential exposure | Medium/Hard depending history rewrite |

### P1 — Fix Before Launch

| Issue | Evidence | Repro | Expected | Actual | Recommended fix | Risk | Effort |
|---|---|---|---|---|---|---|---|
| Hidden/unknown route raw HTML is indexable homepage | Live fetch `/tools/social-downloader`, `/tools/video-compressor`, `/tools/not-a-real-tool` | Fetch raw HTML without JS | Hidden/noindex or real 404 metadata | 200 homepage title/meta, no noindex | Prerender hidden noindex pages or server-route them | SEO/indexing leak | Medium |
| CSP blob-worker console violations | Live Chromium workflow logs | Convert image / extract colors | No CSP errors | Blob worker refused under `script-src 'self'` | Disable worker-using confetti or set reviewed `worker-src` | Runtime noise/policy mismatch | Easy/Medium |
| Dependency advisories | `npm audit --json` | run audit | 0 high | 1 high, 2 moderate | Update affected deps carefully | Security posture | Easy/Medium |
| Required e2e command not clean | `npm.cmd run test:e2e` | port 3000 occupied | 22 e2e tests pass | Playwright refuses because port used and `reuseExistingServer:false` | Free verified stale server or make test config robust without hiding conflicts | Verification gap | Easy |
| Accessibility small/unnamed controls | Live heuristic table | scan mobile routes | named 44×44-ish targets | Several small/unnamed heuristics | Review/fix icon buttons and hidden inputs | Usability/a11y | Medium |

### P2 — Post-launch Improvement

- Color extractor tiny-image smoothing creates intermediate swatches.
- PDF/image chunks are heavy; continue code-splitting.
- GenericUtilityWorkspace is large and contains many beta branches.
- Live production differs from dirty local P1-C worktree; reconcile before final deployment.
- Local `server-dist/server.cjs.map` contains source content but remains outside public dist and live map URLs return 404.

### P3 — Future

- Add richer content/schema only for truthful Functional tools.
- Build browser-only tools with deterministic tests before exposing.
- Add real Lighthouse/axe CI if desired.

## 20. Next 10 Tool Candidates

Prioritized for usefulness, browser-only feasibility, zero recurring cost, low legal/security risk, low bundle impact, maintainability, deterministic testing:

| Candidate | Current status | Why useful | Difficulty | Dependencies | Zero-cost feasibility | Quality risk |
|---|---|---|---|---|---:|---|
| Base64 Encoder & Decoder | beta | Common dev utility | Easy | none | Yes | Low |
| URL Encoder & Decoder | beta | Common dev/SEO utility | Easy | none | Yes | Low |
| HTML Entity Encoder | beta | Common web utility | Easy | none | Yes | Low/Medium XSS display tests |
| Text Reverser & Mirror | beta | Simple text utility | Easy | none | Yes | Low; Unicode grapheme caveat |
| URL Slug & SEO Link Maker | coming-soon | High-use content utility | Easy | none | Yes | Low |
| Alphabetical Line Sorter | coming-soon | Complements line-remover | Easy | none | Yes | Low |
| UUID Batch Generator | coming-soon | Common dev utility | Easy | Web Crypto | Yes | Low |
| Base System Number Converter | coming-soon | Common dev/math utility | Easy | none | Yes | Low |
| HEX Color Blender & Mixer | coming-soon | Useful design utility | Easy | none | Yes | Low |
| Image Dimension Scaler | beta | Useful media utility | Medium | canvas | Yes | Medium; needs decoded-dimension tests |

Avoid as next candidates: social-downloader, currency rates, port scanner, vocal remover, video export tools, and QR unless the privacy/external-provider posture is explicitly accepted.

## 21. Recommended Next Milestone

Recommended next milestone: **Launch Readiness Fixes — P0/P1 Audit Remediation**

Order:

1. Remove/rotate tracked `.env.local` secret and verify no secrets in Git/client bundles.
2. Fix hidden/unknown raw route metadata/status/noindex behavior.
3. Fix CSP blob-worker violations in image/color/PDF workflows.
4. Resolve audit advisories without broad dependency churn.
5. Ensure `npm.cmd run test:e2e` can complete cleanly in the audit environment.
6. Triage accessibility small-target/unnamed-control findings.
7. Re-run full local + live verification from a clean worktree matching deployment.

## 22. Confirmations

| Confirmation | Answer |
|---|---|
| All 113 IDs still exist | YES |
| Actual status totals | 12 Functional, 30 Beta, 51 Coming Soon, 20 Disabled |
| Functional tools genuinely passed | 12/12 core workflows passed; 9 PASS, 3 PASS WITH LIMITATIONS |
| Functional tools failed | 0 core-output failures |
| Hidden tools leak publicly | Homepage/search/sitemap: NO. Raw direct hidden URLs: YES, homepage HTML/no noindex before hydration. |
| Sitemap URL count | 13 |
| Prerender count | 13 pages: homepage + 12 Functional tools |
| Security baseline still holds | PARTIAL: API/header/source-map protections hold; tracked `.env.local` secret and CSP blob-worker violation break launch readiness. |
| Zero-cost architecture still holds | YES for production Functional/API behavior; hidden QR Beta remains external and not public. Google Fonts are third-party but no recurring-cost provider. |
| Social-downloader modified | NO |
| Source code modified during audit | NO |
| Anything committed | NO |
| Anything pushed | NO |
| Anything deployed | NO |

## 23. P1-D Remediation Update

Update date: 2026-08-25  
Scope: P1-D launch-readiness remediation only. No new tools were added, no Beta tools were promoted, social-downloader was not modified, and the zero-cost production architecture was preserved.

### Current Verdict

**LAUNCH READY** for the current local repository state, pending the normal owner decision to commit and deploy.

This supersedes the original launch-blocking verdict above for the P0/P1 items remediated in this milestone. The original audit findings remain preserved for traceability.

### Remediated P0/P1 Items

| Item | Current result |
|---|---|
| Secret incident | `.env.local` exists locally but is untracked, ignored, and absent from `git log --all -- .env.local`. Only `.env.example` is tracked. `.env.example` remains placeholder-only. |
| Vercel OIDC distinction | The local `.env.local` contains a Vercel OIDC variable name, but the file was last modified on 2026-08-03 and no Git history match was found. Vercel OIDC tokens are short-lived, so no reusable long-lived credential was verified in tracked repository history. |
| Git history rewrite | Not performed and not indicated by current evidence because `.env.local` is not tracked and has no path history in this repo. |
| Hidden known route raw HTML | Known hidden routes now generate static noindex HTML with self canonical, truthful unavailable/beta/coming-soon copy, and no homepage title/canonical/WebSite schema leakage. |
| Unknown route raw HTML | `dist/404.html` is generated with `noindex, nofollow`, no canonical URL, and no homepage WebSite schema. Production-test server returns 404 for unknown `/tools/*`. |
| Sitemap | Still 13 URLs total: homepage + 12 Functional tools. Hidden routes are not listed. |
| CSP blob-worker violation | Document CSP now includes `worker-src 'self' blob:` in Vercel and local production server headers. `script-src` remains strict and does not include `unsafe-eval`. |
| Dependency advisories | `postcss` resolved to 8.5.26, transitive `nanoid` to 3.3.18, and optional transitive `dompurify` to 3.4.14. `npm.cmd audit --json` reports 0 total vulnerabilities. |
| E2E port conflict | Playwright production tests now default to dedicated port 4173 via `E2E_PORT`/`PORT`, leaving port 3000 alone. Consecutive E2E runs passed and port 4173 had 0 listeners afterward. |
| Accessibility P1 triage | Added labels/IDs for hidden file inputs, associated generic text labels with textareas, labeled Lorem paragraph count, strengthened toast live-region semantics, and increased essential icon-only action targets/focus rings in image/PDF queues. |

### Added/Updated Tests

- Raw HTTP E2E test for representative Beta, Coming Soon, Disabled, and unknown tool routes.
- SEO tests for generated hidden noindex HTML and generated `404.html`.
- Vercel config regression test now asserts no `/tools` rewrite and explicit `worker-src 'self' blob:`.
- E2E browser workflow tests now cover all 12 Functional tools, including real WebP and PDF download byte-signature checks for image/PDF outputs.

### Final Verification Results

| Command | Exit | Result |
|---|---:|---|
| `npm.cmd install` | 0 after sandbox approval | Up to date, audited 586 packages, found 0 vulnerabilities. |
| `npm.cmd run clean` | 0 after sandbox approval | Removed generated build/test artifacts. |
| `npm.cmd run typecheck` | 0 | Passed. |
| `npm.cmd run lint` | 0 | Passed. |
| `npm.cmd run test` | 0 after sandbox approval | 17 test files, 277 tests passed. |
| `npm.cmd run build:client` | 0 | Sitemap 13 URLs; Vite transformed 5,238 modules; generated 12 indexable tool pages, 101 noindex hidden tool pages, and `404.html`. |
| `npm.cmd run build:server` | 0 | `server-dist/server.cjs` built. |
| `npm.cmd run build` | 0 | Client and server production build passed. |
| `npm.cmd run test:e2e` | 0 after sandbox approval | Final run: 25 tests passed, including real image/PDF download-byte checks. |
| `npm.cmd run check` | 0 after sandbox approval | 17 test files / 277 tests passed, then production build passed. |
| `npm.cmd audit --json` | 0 after approval | 0 critical, 0 high, 0 moderate, 0 low, 0 total vulnerabilities. |

Non-fatal environment notes:

- Several first attempts without approval hit Windows sandbox EPERM on generated outputs or npm/Vite temp files; approved reruns passed.
- Git repeatedly warned that `C:\Users\Munjir\.config\git\ignore` could not be read; this did not affect repository checks.
- Playwright prints a `NO_COLOR`/`FORCE_COLOR` warning; tests still pass.
- One earlier E2E run had a transient Playwright worker-process crash; the final corrected E2E suite passed and left 0 listeners on port 4173.

### Final Confirmations

| Confirmation | Answer |
|---|---|
| 113 route IDs unchanged | YES |
| Status totals | 12 Functional, 30 Beta, 51 Coming Soon, 20 Disabled |
| 12/12 Functional core workflows pass | YES |
| Sitemap URL count | 13 |
| Hidden routes leak indexable homepage metadata | NO in generated/raw production-test HTML |
| Supported image/PDF workflows have CSP violations | NO in final E2E console monitoring |
| npm Critical advisories | 0 |
| npm High advisories | 0 |
| Tracked production secrets | 0 verified |
| Zero-cost architecture preserved | YES |
| Social-downloader touched | NO |
| Paid services added | NO |
| New tools added | NO |
