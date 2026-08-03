# PanUtility-Web tool inventory

> P1-B2 update (2026-08-04): text-tool production-quality pass complete. Case Converter
> (Unicode-safe title/sentence, +PascalCase/kebab-case), Word Counter (paragraphs,
> punctuation-only → 0 words, code-point counts, reading-time estimate), Lorem Ipsum
> (deterministic, no `Math.random`, UI bound 1–20 aligned with library), Duplicate Line
> Remover (no silent trim/blank-drop; explicit trim/blank/case controls; first-occurrence
> + order preserved), and JSON Formatter (format/minify, 5 MB limit, safe errors) are all
> verified. See `docs/P1B2_TEXT_TOOLS_REPORT.md`.

> P0-B update (2026-08-03): security review moved `social-downloader` from Beta to disabled because no safe deterministic provider survived removal of remote-script execution, unofficial scraping, and arbitrary proxying. Current enforced totals are 12 `functional`, 30 `beta`, 51 `coming-soon`, and 20 `disabled` across exactly 113 stable routes. `video-splitter` remains disabled. Public visibility update: only the 12 functional tools are presented in the public catalog (see `docs/PUBLIC_TOOL_VISIBILITY_POLICY.md`); beta, coming-soon, and disabled routes remain directly accessible and truthful.

Audit date: 2026-08-03. Source of truth: `src/toolsData.ts` (113 catalog entries), route selection in `src/App.tsx`, dedicated components, `GenericUtilityWorkspace.tsx`, and `api/index.ts`. A route rendering a workspace is **not** counted as working unless its advertised operation is implemented.

## Reading the inventory

Every route is `/tools/<id>`. Components: **VS** `VideoSplitter.tsx`; **SD** `SocialDownloader.tsx` + `api/index.ts`; **IC** `ImageConverter.tsx`; **CE** `ColorExtractor.tsx`; **PC** `PdfCompiler.tsx`; **AT** `AudioTrimmer.tsx`; **AI** `AudioTranscriber.tsx` + `api/index.ts`; **QR** `QrGenerator.tsx`; **GW** `GenericUtilityWorkspace.tsx`. All also depend on `App.tsx`, `toolsData.ts`, `types.ts`, `Toast.tsx`, `SeoManager.tsx`, and `index.css`.

Status: **Functional** = main promise works in normal supported browsers; **Partial** = meaningful implementation but important claims/paths are wrong; **UI only** = generic UI/simulation with no advertised operation; **Broken** = output is invalid or principal action cannot work reliably; **External** = external service is essential. No automated unit, integration, browser, or accessibility tests exist for any tool (**T0**); root `test_*.js/.mjs` files are manual network experiments, not assertions or an npm test suite.

Issue/state codes (each row's codes cover validation, states, mobile, privacy/security, and known defects):

- **A**: browser file tool uses MIME-prefix/`accept` only, no size/count/dimension/duration limits, magic-byte verification, cancellation, or memory guard; object URLs/large canvas/Web Audio work can exhaust a mobile tab. Loading/success/error coverage varies, but empty/unsupported-file feedback is weak.
- **B**: generic file workspace accepts `.mp4,.webm,.mov,.avi,.mp3,.wav,.ogg,.jpg,.jpeg,.png,.webp,.gif,.svg,.pdf,.txt,.csv,.json,.html` for unrelated tools, does not validate type/size, and often falls through to a fake “conversion simulation finished” success. Shared layout is cramped on small screens; processing is main-thread; no real empty/error model.
- **C**: generic text/code tool has no empty/length limits; output is plain text. URI/Base64 parsing can throw directly from click handlers. It lacks explicit loading/error states and uses a two-column editor only at `lg`.
- **D**: generic calculator accepts incomplete/unchecked numeric input and/or uses a toy formula. It has no loading/error state, no persistence, and dense controls on mobile.
- **E**: generic lifestyle/game fallback is a slider or “Trigger Interactive Action Move” simulation unrelated to the named tool. It provides false success, no meaningful validation/states/persistence, and is UI only.
- **F**: output uses canvas/media/browser APIs, so codec support is browser-dependent; output naming/type claims may not match encoded bytes. No capability preflight, cancellation, worker isolation, or mobile memory protection.
- **G**: server/external tool uploads or proxies user content/URLs despite site-wide “zero server uploads”/“100% client” claims. No auth, rate limit, CSRF/origin control, usage quota, bounded upstream download, or request timeout throughout.
- **H**: server URL validation is SSRF-incomplete: DNS failure is allowed, only one A/AAAA result is checked, many IPv4/IPv6 private/reserved ranges are omitted, redirects are not revalidated, enabling rebinding/redirect bypass risk.
- **I**: fake progress/success is disconnected from actual browser download or processing result.
- **J**: state exists only in component memory; reload/navigation loses data. Touch targets/dense grids are weak on narrow screens.
- **K**: advertised format/operation is not actually produced (details in row).

## Video and animation (13)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| Video Splitting & Cutting (`video-splitter`) | VS | **Broken** | browser `video/*` (claims MP4/WebM) → source-type byte slice or recorded WebM | Browser | Default and all batch exports cut bytes by time ratio, not container samples, so headers/index/moov data are usually invalid; fallback repeats this. Recording path is browser-dependent. A,F,K; no truthful failure detection. | T0 |
| Social Video Downloader (`social-downloader`) | SD | **Partial, External** | YouTube/TikTok/Instagram/Facebook/Twitter/X URL + quality → proxied MP4/claimed MP3 | Server resolution/proxy + browser download | Community Cobalt, SaveFrom and SnapSave scraping are brittle; selected quality is not reliably honored; returned audio may not be MP3; fake completion ignores download failure; exposes server stack. G,H,I,K; legal/ToS risk. | T0; manual root network scripts only |
| GIF Converter & Maker (`gif-maker`) | GW | **Partial** | image(s) or video → GIF data URI/download | Browser (`gifshot`, canvas) | Only one uploaded file is modeled, undermining “multiple images”; video samples a limited 320px rendition; main-thread/high memory. A,B,F. | T0 |
| Video to MP3 Extractor (`video-to-audio`) | GW | **Partial** | uploaded media → WAV | Browser Web Audio | Does not produce MP3; browser decoding only; large file memory risk. A,F,K. | T0 |
| Video Frame Grabber (`frame-extractor`) | GW | **Partial** | uploaded video → JPEG | Browser canvas | One current frame only; generic accept/validation; no seek/decode error UX. A,B,F. | T0 |
| Video Speed Controller (`video-speed`) | GW | **Broken** | video + 0.25–4x control → none | Browser preview only | Changes `playbackRate`; “Apply” reports success but creates no adjusted clip/download. B,I,K. | T0 |
| Video Audio Remover (`video-muter`) | GW | **Broken** | video → none | Browser preview only | Sets preview muted; creates no muted export. B,I,K. | T0 |
| Video Compressor (`video-compressor`) | GW | **UI only** | generic upload → fake result | None | No compressor/encoder or output. B,I,K. | T0 |
| Video Looper & Repeater (`video-looper`) | GW | **UI only** | generic upload → fake result | None | No loop count, concatenation, or output. B,I,K. | T0 |
| Video Rotator (`video-rotator`) | GW | **Broken** | video + angle → none | CSS preview only | Rotation is visual CSS; handler reports success but exports nothing. B,I,K. | T0 |
| Video Aspect Ratio Resizer (`video-resizer`) | GW | **Broken** | video + width/height → none | Browser preview only | Resize handler only supports `Image`; video path returns without output. B,K. | T0 |
| Video Watermark Adder (`video-watermark`) | GW | **Broken** | video + text/position → none | Overlay preview only | Canvas export handler requires `Image`; video watermark is not rendered/exported. B,I,K. | T0 |
| SRT Subtitle Creator (`subtitles-editor`) | GW | **UI only** | generic upload → fake result | None | No subtitle editor, timing model, SRT generation, or hardcoding. B,I,K. | T0 |

## Image and design (13)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| Image Format Converter (`image-converter`) | IC | **Functional** | `image/*`; UI targets JPEG/PNG/WebP + optional dimensions/quality → JPEG/PNG/WebP | Browser canvas | A,F; animated/vector content is rasterized; unsupported canvas encoders can silently return null; sequential main-thread batch; no ZIP download. | T0 |
| Color Palette Extractor (`color-extractor`) | CE | **Functional** | `image/*` → 8 HEX/RGB swatches copied as text | Browser canvas | A,F; downsamples to 40×40 and buckets channels, so “distinct” colors are approximate; no alpha/color-profile handling. | T0 |
| Smart Image Compressor (`image-compressor`) | GW | **Partial** | uploaded image → JPEG | Browser canvas | Always JPEG regardless of source; quality slider only; transparency lost; generic validation. A,B,F,K. | T0 |
| Client-Side Image Cropper (`image-cropper`) | GW | **UI only** | generic upload → fake result | None | No crop rectangle, transform controls, or export. B,I,K. | T0 |
| Aesthetic Meme Generator (`meme-generator`) | GW | **Partial** | image + top/bottom text/font size → JPEG | Browser canvas | Single-line text can overflow; no wrapping/safe margins/font choice; transparency lost. A,B,F. | T0 |
| Interactive Pixel Art Maker (`pixel-art`) | GW | **UI only** | generic upload/grid UI → fake result | None | UI displays a decorative grid; no painting state or image export. B,I,K. | T0 |
| EXIF Metadata Inspector (`exif-viewer`) | GW | **Broken** | any upload → fabricated metadata text | Browser simulation | `simulateExif` returns hard-coded camera/GPS-like values, a privacy-misleading false result. B,I,K. | T0 |
| Favicon & App Icon Generator (`favicon-generator`) | GW | **Broken** | image → PNG data named `.ico` | Browser canvas | A 32×32 PNG is downloaded with ICO extension; no multi-size/iOS/Android set. A,B,F,K. | T0 |
| SVG Optimizer & Beautifier (`svg-optimizer`) | GW | **UI only** | generic upload → fake result | None | No SVG parser/optimizer/minifier. B,I,K; accepting active SVG warrants safe parsing if implemented. | T0 |
| CSS Photo Filters (`image-filters`) | GW | **Partial** | image + brightness/contrast/saturation/grayscale → JPEG | Browser canvas | Only a subset of advertised filters; no blur/sepia control; loses transparency; A,B,F. | T0 |
| Image Dimension Scaler (`image-resizer`) | GW | **Partial** | image + width/height → JPEG | Browser canvas | No aspect lock despite claim, unconstrained dimensions, JPEG-only. A,B,F,K. | T0 |
| Aesthetic CSS Gradient Designer (`gradient-generator`) | GW | **UI only** | generic upload → fake result | None | No gradient stops, preview, or CSS output. B,I,K. | T0 |
| Image to ASCII Converter (`ascii-art`) | GW | **Partial** | image → text ASCII | Browser canvas | Fixed/downsampled conversion, no character/width controls; generic file validation and main-thread work. A,B,F. | T0 |

## Documents and PDF (11)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| PDF Compiler / Images to PDF (`pdf-compiler`) | PC | **Functional** | `image/*` list → PDF | Browser (`jsPDF`, canvas) | A,F; all pages inherit first image dimensions/orientation; rasterizes to JPEG 0.85; large sets can freeze/crash; title not sanitized beyond browser behavior. | T0 |
| PDF to Text Extractor (`pdf-to-txt`) | GW | **UI only** | PDF accepted → fake/plain result | None | No PDF parser/OCR; falls through to simulated success. B,I,K. | T0 |
| Plain Text to PDF Maker (`txt-to-pdf`) | GW | **UI only** | generic upload → fake result | None | No text editor/layout/PDF generation. B,I,K. | T0 |
| PDF Page Splitter (`pdf-splitter`) | GW | **UI only** | PDF accepted → fake result | None | No PDF parser/page selection/output. B,I,K. | T0 |
| EPUB to PDF Converter (`epub-to-pdf`) | GW | **UI only** | generic upload (EPUB is not accepted) → fake result | None | File picker omits `.epub`; no EPUB/PDF engine. B,I,K. | T0 |
| CSV to JSON Structurer (`csv-to-json`) | GW | **Partial** | text/CSV file → JSON text/file | Browser `FileReader` | Naive comma split: breaks quoted commas, escaped quotes, multiline fields, BOM and duplicate headers; empty CSV error is only output text. B,K. | T0 |
| Excel to CSV Converter (`excel-to-csv`) | GW | **Broken** | generic upload (XLS/XLSX not accepted) → file bytes/text labeled CSV | Browser `FileReader` | No Excel parser; picker omits Excel; conversion branch is absent/fake. B,I,K. | T0 |
| PDF File Merger (`pdf-merger`) | GW | **UI only** | one generic upload → fake result | None | No multi-file model or PDF merge engine. B,I,K. | T0 |
| PDF Page Rotator (`pdf-rotator`) | GW | **UI only** | PDF accepted → fake result | None | No PDF page render/rotation/output. B,I,K. | T0 |
| JSON to CSV Converter (`json-to-csv`) | GW | **Partial** | JSON array text/file → CSV text/file | Browser `FileReader` | Only top-level array; union of keys is not used; nested values stringify poorly; CSV escaping is incomplete. B,K. | T0 |
| Markdown to HTML compiler (`markdown-to-html`) | GW | **Partial** | Markdown text/file → HTML text/file | Browser regexes | Not GFM or a real parser; incomplete/incorrect nesting and no sanitization if later previewed. B,K. | T0 |

## Audio and music (11)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| Audio Waveform Trimmer (`audio-trimmer`) | AT | **Partial** | `audio/*` → PCM WAV segments | Browser Web Audio | Advertises WAV/MP3 but always encodes WAV while filename retains original extension (`cut_..._<original>`), causing MIME/extension mismatch. A,F,K; whole-file decode is memory-heavy. | T0 |
| AI Audio Transcriber (`audio-transcriber`) | AI | **Partial, External** | `audio/*` or microphone WebM blob mislabeled MP3 → TXT/SRT | Browser capture + server Gemini 2.5 Flash | Audio/base64 is uploaded; 50 MB JSON limit, base64 overhead, no auth/rate limit/consent/retention notice. Recorder blob is labeled `audio/mp3` although MediaRecorder usually emits WebM/Opus. Generated SRT assumes parseable timestamps. G,K; site privacy claim false. | T0 |
| High-Fidelity Voice Recorder (`sound-recorder`) | GW | **UI only** | generic upload → no recording | None | No microphone capture/levels/export. B,I,K. | T0 |
| Audio Clip Merger (`audio-merger`) | GW | **UI only** | one generic upload → fake result | None | No multi-file model, decode/concatenate, or output. B,I,K. | T0 |
| Real-Time Voice Modulator (`voice-changer`) | GW | **UI only** | generic upload → fake result | None | No microphone/audio graph/effects/export. B,I,K. | T0 |
| Vocal Splitter (`vocal-remover`) | GW | **Broken** | media → WAV copy/extraction | Browser Web Audio | Shares video-to-WAV extractor; performs no source separation and creates no vocal/instrumental stems. A,B,F,I,K. | T0 |
| Audio Silence Cutter (`silence-remover`) | GW | **Broken** | media → WAV copy/extraction | Browser Web Audio | Shares extractor; no silence detection or cutting. A,B,F,I,K. | T0 |
| Audio Speed Changer (`audio-speed`) | GW | **UI only** | generic upload → fake result | None | No speed/pitch processing or output. B,I,K. | T0 |
| Tap Tempo & BPM Counter (`bpm-finder`) | GW | **UI only** | generic upload → fake result | None | No tap control/timestamps/BPM calculation. B,I,K. | T0 |
| Rhythm & Tempo Metronome (`metronome`) | GW | **UI only** | generic upload → fake result | None | No tempo control, scheduler, or sound. B,I,K. | T0 |
| Audio Format Converter (`audio-converter`) | GW | **UI only** | generic upload → fake result | None | No format selector/encoder/output. B,I,K. | T0 |

## Text and writing (17)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| Text Case Converter (`case-converter`) | GW | **Functional** | text → upper/lower/title/sentence/camel/pascal/snake/kebab text | Browser | C; identifier modes do not split existing camelCase boundaries; title/sentence are Unicode-aware. | T0 |
| Word & Character Counter (`word-counter`) | GW | **Functional** | text → counts text | Browser | C; 200-wpm reading estimate only; grapheme-cluster (ZWJ) grouping not applied; Unicode code-point counting, paragraphs, and punctuation-only → 0 words verified. | T0 |
| Lorem Ipsum Generator (`lorem-ipsum`) | GW | **Functional** | paragraph count 1–20 → deterministic text | Browser | C; fixed 8-sentence Latin pool (cycles by index); output deterministic and copy-ready. | T0 |
| Text Diff Checker (`text-diff`) | GW | **UI only** | one text area → none | None | No second input/diff algorithm. C,K. | T0 |
| Interactive Markdown Editor (`markdown-editor`) | GW | **UI only** | text → none | None | No preview or Markdown transformation. C,K. | T0 |
| Interactive RegEx Tester (`regex-tester`) | GW | **UI only** | text → none | None | No pattern/flags/matches/errors. C,K. | T0 |
| URL Slug & SEO Link Maker (`slug-generator`) | GW | **UI only** | text → none | None | No slug action. C,K. | T0 |
| Alphabetical Line Sorter (`text-sorter`) | GW | **UI only** | text → none | None | No sorting action. C,K. | T0 |
| Find & Replace Text Engine (`find-replace`) | GW | **UI only** | text → none | None | No find/replacement inputs/action. C,K. | T0 |
| Morse Code Translator (`morse-translator`) | GW | **Partial** | text ↔ Morse text; optional tone | Browser | Unsupported characters are silently dropped; decoding loses word separators; audio scheduling lacks cancel/error UX. C. | T0 |
| Binary to Text Translator (`binary-translator`) | GW | **Partial** | JS UTF-16 code units ↔ space-separated binary | Browser | Encoder pads minimum 8 bits but emits >8-bit Unicode while decoder assumes arbitrary units; malformed tokens can yield garbage. C,K. | T0 |
| Base64 Encoder & Decoder (`base64-coder`) | GW | **Partial** | text ↔ Base64 | Browser | Unicode workaround is deprecated/fragile; malformed Base64 error is output text. C. | T0 |
| URL Encoder & Decoder (`url-coder`) | GW | **Partial** | text ↔ percent-encoded text | Browser | `decodeURIComponent` throws uncaught on malformed `%` input. C. | T0 |
| HTML Entity Encoder (`html-entities`) | GW | **Partial** | text → numeric entities | Browser | Encode only despite generic tool wording; misses many ASCII characters by design; no decode. C. | T0 |
| Text Reverser & Mirror (`text-reverser`) | GW | **Partial** | text → reversed characters/words | Browser | Reversing UTF-16 splits emoji/graphemes; no mirrored glyph output. C,K. | T0 |
| Duplicate Line Remover (`line-remover`) | GW | **Functional** | lines → deduplicated lines | Browser | C; no silent trim/blank-drop (defaults preserve formatting); explicit trim/remove-blank/case options; first occurrence + order preserved. | T0 |
| Creative Prompt Generator (`sentence-generator`) | GW | **UI only** | text → none | None | No generation logic/API/offline prompt set. C,K. | T0 |

## Developer tools (15)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| QR Code Generator (`qr-generator`) | QR | **Partial, External** | text/URL/phone + size/colors → PNG | External `api.qrserver.com` render/download | User payload is sent in query string to third party; no privacy notice/length validation; remote image is not locally generated; fallback opens third-party URL. G; loading and toast exist, no inline error. | T0 |
| JSON Beautifier & Validator (`json-formatter`) | GW | **Functional** | JSON text → formatted/minified JSON/error text | Browser | C; format + minify, 5 MB safety limit, safe syntax errors; no schema validation. | T0 |
| Cryptographic Hash Solver (`hash-generator`) | GW | **Broken** | text → DJB2/SDBM text | Browser | Labels non-cryptographic 32-bit hashes as “cryptographic”; no SHA family/Web Crypto. C,K; security-misleading. | T0 |
| UUID Batch Generator (`uuid-generator`) | GW | **UI only** | generic workspace → none | None | No UUID generation. B/K. | T0 |
| YAML to JSON Converter (`yaml-to-json`) | GW | **Broken** | any text → hard-coded JSON | Simulation | Does not parse YAML; always returns a canned success object. C,I,K. | T0 |
| XML Beautifier (`xml-beautifier`) | GW | **UI only** | text → none | None | No parser/formatter/error reporting. C,K. | T0 |
| JWT Debugger (`jwt-debugger`) | GW | **UI only** | text → none | None | No token split/Base64URL decode/claims display/signature warning. C,K. | T0 |
| SQL Query Formatter (`sql-formatter`) | GW | **UI only** | text → none | None | No SQL parser/formatter. C,K. | T0 |
| Cron Expression Checker (`cron-parser`) | GW | **UI only** | generic workspace → none | None | No cron input/parser/next-run output. B,K. | T0 |
| Port Ingress Simulator (`port-scanner`) | GW | **UI only** | generic workspace → none | None | No simulator or network behavior; a real browser port scanner would create abuse/privacy concerns. B,K. | T0 |
| HEX Color Blender & Mixer (`color-blender`) | GW | **UI only** | generic workspace → none | None | No color inputs/blending/output. B,K. | T0 |
| WCAG Accessibility Checker (`contrast-checker`) | GW | **UI only** | generic workspace → none | None | No colors, luminance, contrast ratio, AA/AAA evaluation. B,K. | T0 |
| Base System Number Converter (`base-converter`) | GW | **UI only** | generic workspace → none | None | No base/value inputs/conversion. B,K. | T0 |
| User Agent Inspector (`user-agent`) | GW | **UI only** | generic workspace → none | None | Does not read or parse `navigator.userAgent`. B,K. | T0 |
| Mock API Response Builder (`mock-api`) | GW | **UI only** | generic workspace → none | None | No status/header/body editor or mock endpoint/export. B,K. | T0 |

## Math and finance (11)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| Scientific Algebra Calculator (`scientific-calc`) | GW | **Broken** | expression string → number | Browser `Function(...)` | Uses dynamic code execution on user input and is not a scientific parser; arbitrary JS expressions execute in page context (self-XSS/security design flaw). D,K. | T0 |
| Universal Unit Converter (`unit-converter`) | GW | **Partial** | number + limited conversion type → number text | Browser | Only a few hard-coded conversions, not universal; weak numeric validation. D,K. | T0 |
| Universal Currency Rates (`currency-converter`) | GW | **Broken** | amount/currency controls → hard-coded estimate | Browser | No exchange-rate service/date; result is stale/fabricated. D,I,K; financial accuracy risk. | T0 |
| Percentage Calculator (`percent-calc`) | GW | **Functional** | percentage + value → number | Browser | D; only one percentage mode, permits non-finite/negative values without guidance. | T0 |
| Friendly Bill & Tip Splitter (`tip-calc`) | GW | **Functional** | bill, tip %, people → totals | Browser | D; division/rounding/invalid people inputs need validation. | T0 |
| Academic GPA Calculator (`gpa-calc`) | GW | **Partial** | course name, credits, fixed letter grades → GPA | Browser | No scale selection, pass/fail/repeats/locale rules; permits invalid credits and empty course names. D,J. | T0 |
| Age & Millisecond Calculator (`age-calc`) | GW | **Partial** | birth date → approximate age/days/time | Browser | Needs future/invalid-date validation and calendar-accurate age semantics. D. | T0 |
| Amortization & Loan Planner (`loan-calc`) | GW | **Partial** | principal/rate/years → payment/interest | Browser | No amortization schedule, fees/compounding/locale; zero/invalid term edge cases. D; financial disclaimer absent. | T0 |
| Matrix Algebra Solver (`matrix-calc`) | GW | **UI only** | shared generic controls → none/irrelevant | None | No matrix grid/operations. D,K. | T0 |
| Binary Mathematics Solver (`binary-math`) | GW | **UI only** | shared generic controls → none/irrelevant | None | No binary operands/operators. D,K. | T0 |
| Fibonacci Sequence Solver (`fibonacci-gen`) | GW | **UI only** | shared generic controls → none/irrelevant | None | No term/count input or sequence. D,K. | T0 |

## Health and lifestyle (11)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| BMI Healthy Weight Solver (`bmi-calc`) | GW | **Partial** | kg/cm → BMI/category | Browser | Minimal range/zero validation; no unit choice, clinical caveats, age/pregnancy limits. D; health accuracy risk. | T0 |
| BMR Energy Estimator (`bmr-calc`) | GW | **Broken** | generic 1–100 slider → toy calorie values | Browser simulation | Does not ask age/sex/height/weight or implement a BMR formula. D,E,I,K; health-misleading. | T0 |
| Calorie Tracker & Food Diary (`calorie-counter`) | GW | **UI only** | slider → generic progress text | Simulation | No foods, servings, diary, totals, storage. E,K. | T0 |
| Sleep Aid Ambient Sounds (`noise-maker`) | GW | **Partial** | white/brown/sine choice → live audio | Browser Web Audio | “Brown noise” implementation/levels need verification; no volume, timer, background handling, hearing warning; buttons share active styling. F,J. | T0 |
| Hourly Daily Task Planner (`planner`) | GW | **UI only** | slider → generic progress text | Simulation | No tasks/hours/editing/persistence. E,K. | T0 |
| Symmetrical Box Breathing (`breath-guide`) | GW | **Partial** | start/stop → animated phase timer | Browser | Basic timer works; pause/resume phase semantics and reduced-motion/accessibility guidance missing. J. | T0 |
| Step & Cardio Estimator (`step-sim`) | GW | **Broken** | slider → toy steps/distance/calories | Browser simulation | No actual step input/body parameters; arbitrary coefficients. D,E,I,K; health accuracy risk. | T0 |
| Pomodoro Productivity Clock (`pomodoro`) | GW | **Partial** | 25/5 minute preset → countdown | Browser | No reset/custom duration/notification/background drift handling/persistence. J. | T0 |
| Daily Streak Habit Tracker (`habit-tracker`) | GW | **Partial** | three hard-coded habits/toggles → UI state | Browser | Cannot add/edit/remove habits; no streak logic or persistence despite title. E,J,K. | T0 |
| Daily Water Intake Logger (`water-tracker`) | GW | **Partial** | +8 oz/reset → UI tally | Browser | Hard-coded 80 oz guidance, no personalization/persistence; can exceed target; health caveat absent. E,J. | T0 |
| Optimal Sleep Stage Planner (`sleep-calculator`) | GW | **UI only** | slider → generic progress text | Simulation | No bedtime/wake-time/cycle calculation. E,K. | T0 |

## Fun and games (11)

| Tool (route id) | Main | Status | Input → output | Processing | Verified defects / risks / missing states | Tests |
|---|---|---|---|---|---|---|
| Secure Password Generator (`password-gen`) | GW | **Partial** | length 6–32 + character sets → text | Browser `Math.random` | Not cryptographically secure; permits all sets disabled; no entropy/ambiguous-character controls. E,K; title is security-misleading. | T0 |
| Polyhedral Dice Roller (`dice-roller`) | GW | **Functional** | d4/d6/d8/d10/d12/d20 → number | Browser `Math.random` | J; pseudo-random entertainment only, no history/quantity/modifier. | T0 |
| Coin Flipper & Odds Checker (`coin-flipper`) | GW | **Partial** | click → heads/tails | Browser `Math.random` | No odds checker/statistics despite title; animation state is cosmetic. E,K. | T0 |
| RPS Arena vs. AI Bot (`rock-paper-scissors`) | GW | **Functional** | rock/paper/scissors → random bot/result | Browser | J; minimal game, no reset/history/accessibility announcement. | T0 |
| Tic-Tac-Toe Board (`tic-tac-toe`) | GW | **UI only** | generic trigger → canned score text | Simulation | No board, turns, win logic, or AI. E,I,K. | T0 |
| Random Selector Wheel (`name-picker`) | GW | **UI only** | generic trigger → canned score text | Simulation | No names, wheel, random selection. E,I,K. | T0 |
| Compatibility Love Solver (`love-calculator`) | GW | **UI only** | generic trigger → canned score text | Simulation | No names/calculation; route is unrelated placeholder. E,I,K. | T0 |
| Offline General Trivia (`trivia-quiz`) | GW | **UI only** | generic trigger → canned score text | Simulation | No questions/answers/scoring. E,I,K. | T0 |
| Reaction Time Tester (`reaction-test`) | GW | **UI only** | generic trigger → canned score text | Simulation | No randomized wait/reaction measurement/false-start handling. E,I,K. | T0 |
| Word Anagram Solver (`anagram-solver`) | GW | **UI only** | generic trigger → canned score text | Simulation | No word input/dictionary/anagram logic. E,I,K. | T0 |
| Mini Sudoku Board (`sudoku-solver`) | GW | **UI only** | generic trigger → canned score text | Simulation | No grid/input/validation/solver. E,I,K. | T0 |

## Inventory totals

## Zero-cost production update

`audio-transcriber` is currently **Disabled** in the deployed catalog. It has no processing, supported formats, executable component, or sitemap entry. Its route presents: “Server-based transcription is temporarily unavailable in the free deployment.” The retained implementation is not loaded by the disabled route. This supersedes the historical inventory observation for that tool.

Classification is deliberately conservative: **12 functional**, **33 partial** (including 3 external-dependent), **51 UI only**, and **17 broken**. Since the public catalog now presents only the 12 functional tools, the distinction matters most for planning: 101 hidden routes are either UI only, partial, or broken even though all 113 remain addressable for direct-route availability checks.
