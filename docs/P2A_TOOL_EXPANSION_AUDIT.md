# P2-A Tool Expansion Audit

## Executive Summary

P2-A audits all 101 hidden tools (30 Beta, 51 Coming Soon, 20 Disabled) and promotes a curated first batch of 5 pure text/developer tools to Functional status. All selected tools are browser-local, zero-cost, deterministic, and require no new dependencies.

## Hidden-Tool Audit Summary

### Registry Totals

| Status | Count | Implementation Status |
|--------|-------|----------------------|
| Functional | 12 | All working, public catalog |
| Beta | 30 | All have real implementations in GenericUtilityWorkspace |
| Coming Soon | 51 | Pure registry entries, no implementation code |
| Disabled | 20 | Blocked at ToolWorkspace gate, show DisabledTool shell |
| **Total** | **113** | |

### Feasibility Counts

| Classification | Count | Description |
|---------------|-------|-------------|
| **A — Easy/High Value** | 15 | Pure logic, browser APIs, minimal dependency impact |
| **B — Medium** | 12 | Real implementation possible, needs meaningful UI/validation work |
| **C — Heavy** | 18 | Browser-local possible but large dependency, CPU/memory heavy |
| **D — Server/API Required** | 8 | Not compatible with zero-cost production |
| **E — Do Not Build** | 48 | Unsafe, misleading, legally risky, impractical, or maintenance-heavy |

## Top 15 Candidates

Ranked by (user value × feasibility × search demand) / implementation cost:

| Rank | Tool ID | Status | Category | Value | Feasibility | Rationale |
|------|---------|--------|----------|-------|-------------|-----------|
| 1 | base64-coder | Beta | Text | 10 | A | Pure transform, Unicode-safe, already works |
| 2 | url-coder | Beta | Text | 10 | A | Pure transform, already works |
| 3 | html-entities | Beta | Text | 9 | A | High developer value, needs decode + Unicode fix |
| 4 | text-reverser | Beta | Text | 7 | A | Simple, needs Array.from fix for Unicode |
| 5 | morse-translator | Beta | Text | 7 | A | Unique, encode/decode + audio, already works |
| 6 | csv-to-json | Beta | Data | 9 | B | High developer value, needs proper CSV parser |
| 7 | json-to-csv | Beta | Data | 8 | B | High developer value, needs nested object handling |
| 8 | unit-converter | Beta | Math | 9 | B | Universal appeal, needs bidirectional conversion |
| 9 | gpa-calc | Beta | Math | 7 | A | Student audience, needs text artifact fix |
| 10 | age-calc | Beta | Math | 8 | A | Universal appeal, needs next birthday fix |
| 11 | bmi-calc | Beta | Health | 8 | B | Universal appeal, needs custom input fields |
| 12 | loan-calc | Beta | Finance | 8 | B | High search value, needs 0% interest fix |
| 13 | password-gen | Disabled | Security | 10 | A | Very high search, needs crypto.getRandomValues rewrite |
| 14 | hash-generator | Disabled | Dev | 8 | A | Needs honest labeling (non-cryptographic) |
| 15 | markdown-to-html | Beta | Text | 7 | C | Needs proper Markdown library |

## Rejected Candidates (Category D/E)

### Server/API Required (D)
- audio-transcriber: Requires Google Gemini API
- currency-converter: Requires live exchange rates
- qr-generator: Uses external API (api.qrserver.com)
- video-splitter: Requires FFmpeg/WASM for valid export
- video-compressor: Requires FFmpeg/WASM
- audio-converter: Requires FFmpeg/WASM
- epub-to-pdf: Requires EPUB parsing library

### Do Not Build (E)
- social-downloader: Unsafe scraping, legal risk
- port-scanner: Network scanning, security risk
- mock-api: Misleading, no real value
- love-calculator: Misleading, no real calculation
- scientific-calc: Previously used eval(), unsafe
- yaml-to-json: Previously fabricated output
- currency-converter: Previously fabricated rates
- bmr-calc: Previously fabricated health data
- step-sim: Previously fabricated estimates
- All remaining coming-soon tools with no implementation

## Batch Strategy

### P2-A1 — Pure Text/Developer Tools (5 tools)
**Characteristics**: Pure browser-local, no dependencies, already working or trivial fixes, high search value.

1. base64-coder
2. url-coder
3. html-entities
4. text-reverser
5. morse-translator

### P2-A2 — Data Conversion (3 tools)
**Characteristics**: File parsing, needs proper libraries, moderate testing.

1. csv-to-json
2. json-to-csv
3. markdown-to-html

### P2-A3 — Math/Health Calculators (3 tools)
**Characteristics**: UI improvements needed, custom input fields, bidirectional conversion.

1. unit-converter
2. bmi-calc
3. age-calc

## First Batch Selected: P2-A1

### Tool Details

#### 1. base64-coder
- **Current status**: Beta, fully working
- **Implementation**: `runBase64()` in GenericUtilityWorkspace.tsx
- **Logic**: Unicode-safe Base64 via `btoa(unescape(encodeURIComponent(text)))` / `atob()` with URI component chain
- **Edge cases**: Empty input handled, malformed Base64 caught with try/catch
- **Fix needed**: None — production-ready
- **Tests needed**: Unit tests for encode/decode, Unicode, empty, invalid

#### 2. url-coder
- **Current status**: Beta, fully working
- **Implementation**: Inline lambda in GenericUtilityWorkspace.tsx
- **Logic**: `encodeURIComponent()` / `decodeURIComponent()` with try/catch
- **Edge cases**: URIError caught, empty input handled
- **Fix needed**: None — production-ready
- **Tests needed**: Unit tests for encode/decode, Unicode, empty, invalid

#### 3. html-entities
- **Current status**: Beta, partially working
- **Implementation**: Inline lambda in GenericUtilityWorkspace.tsx
- **Current encode**: `inputText.replace(/[\u00A0-\u9999<>\&]/g, (i) => '&#'+i.charCodeAt(0)+';')`
- **Issues**: No decode, incomplete Unicode coverage (misses U+9999+), misses `"` and `&`
- **Fix needed**: Add decode functionality, expand Unicode coverage, add `&` and `"` encoding
- **Tests needed**: Unit tests for encode/decode, HTML entities, Unicode, empty

#### 4. text-reverser
- **Current status**: Beta, mostly working
- **Implementation**: Inline lambdas in GenericUtilityWorkspace.tsx
- **Current**: `inputText.split('').reverse().join('')`
- **Issue**: `split('')` corrupts surrogate pairs (emoji, non-BMP characters)
- **Fix needed**: Change `split('')` to `Array.from(inputText)` for character reversal
- **Tests needed**: Unit tests for character/word reversal, Unicode, empty

#### 5. morse-translator
- **Current status**: Beta, working
- **Implementation**: `runMorseCode()` + `playMorseSound()` in GenericUtilityWorkspace.tsx
- **Logic**: Full encode/decode table, Web Audio API playback (650Hz sine, dot=80ms, dash=240ms)
- **Edge cases**: Unmapped characters silently dropped, 150-char playback cap
- **Fix needed**: None — production-ready for basic use
- **Tests needed**: Unit tests for encode/decode, round-trip, sound playback

## Changes By Tool

### base64-coder
- Status: beta → functional
- No code changes needed
- Add unit tests
- Add SEO metadata
- Add to sitemap/prerender

### url-coder
- Status: beta → functional
- No code changes needed
- Add unit tests
- Add SEO metadata
- Add to sitemap/prerender

### html-entities
- Status: beta → functional
- Add decode functionality
- Expand Unicode coverage
- Add `&` and `"` to encode set
- Add unit tests
- Add SEO metadata
- Add to sitemap/prerender

### text-reverser
- Status: beta → functional
- Fix `split('')` → `Array.from()` for Unicode safety
- Add unit tests
- Add SEO metadata
- Add to sitemap/prerender

### morse-translator
- Status: beta → functional
- No code changes needed
- Add unit tests
- Add SEO metadata
- Add to sitemap/prerender

## Tests Added

### Unit Tests
- base64 encode/decode: ASCII, Unicode, empty, invalid
- url encode/decode: ASCII, Unicode, empty, invalid
- html entity encode/decode: special chars, Unicode, empty
- text reverse: characters, words, Unicode emoji, empty
- morse encode/decode: A-Z, 0-9, round-trip, empty

### UI Tests
- Input/output for each tool
- Copy/download functionality
- Reset functionality
- Validation error states

### E2E
- Representative flow for each tool

## Existing Functional Regression

All 12 existing Functional tools remain intact:
- Image Converter, Color Extractor, PDF Compiler
- Case Converter, Word Counter, Lorem Ipsum, Duplicate Line Remover, JSON Formatter
- Percentage Calculator, Tip Calculator
- Dice Roller, Rock Paper Scissors

## Performance Impact

- No new dependencies added
- No new lazy chunks created
- All 5 tools use existing GenericUtilityWorkspace code paths
- Bundle impact: negligible (< 1 KB total)
- Initial JS unchanged

## Security/Privacy Result

- All 5 tools process browser-local only
- No network requests made
- No unsafe eval/Function used
- No secrets exposed
- No new external processors

## Updated Registry Totals

| Status | Before | After | Delta |
|--------|--------|-------|-------|
| Functional | 12 | 17 | +5 |
| Beta | 30 | 25 | -5 |
| Coming Soon | 51 | 51 | 0 |
| Disabled | 20 | 20 | 0 |
| **Total** | **113** | **113** | **0** |

## Sitemap/Prerender Totals

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Sitemap URLs | 13 | 18 | +5 |
| Prerendered pages | 114 | 119 | +5 |

## Remaining Roadmap

### P2-A2 — Data Conversion (next batch)
- csv-to-json (needs proper CSV parser)
- json-to-csv (needs nested object handling)
- markdown-to-html (needs proper Markdown library)

### P2-A3 — Math/Health Calculators
- unit-converter (needs bidirectional conversion)
- bmi-calc (needs custom input fields)
- age-calc (needs next birthday fix)

### Future Batches
- Password generator (needs crypto.getRandomValues)
- Hash generator (needs honest labeling)
- Image tools (image-compressor, image-filters, image-resizer)
- Developer tools (uuid-generator, base-converter, color-blender)
