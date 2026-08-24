# P2-A2 Tool Expansion Report

## Executive Summary

P2-A2 promotes 5 hidden tools from Coming Soon to Functional status, bringing the total from 17 to 22 Functional tools. All selected tools are pure browser-local, zero-cost, deterministic, and require no new dependencies.

## Candidate Audit

### Selection Criteria

From the P2-A audit's ranked candidates, 6 tools were shortlisted:

| Tool | Status | Category | Value | Feasibility | Selection |
|------|--------|----------|-------|-------------|-----------|
| slug-generator | coming-soon | Text & Writing | High | Easy | **Selected** |
| text-sorter | coming-soon | Text & Writing | High | Easy | **Selected** |
| uuid-generator | coming-soon | Developer Tools | High | Easy | **Selected** |
| base-converter | coming-soon | Developer Tools | High | Easy-Medium | **Selected** |
| contrast-checker | coming-soon | Developer Tools | Medium | Medium | **Selected** |
| color-blender | coming-soon | Developer Tools | Medium | Heavy UI | Deferred |

### Deferred Tools

| Tool | Reason |
|------|--------|
| color-blender | Requires custom color picker UI, ratio slider, real-time interpolation — too heavy for this batch |
| csv-to-json | Requires proper CSV parsing library |
| json-to-csv | Requires nested object handling |
| markdown-to-html | Requires Markdown library |

## Issue Matrix

| Tool | Advertised Behavior | Actual Behavior | Missing Validation | Accessibility | Mobile | Tests | Readiness |
|------|-------------------|----------------|-------------------|---------------|--------|-------|-----------|
| slug-generator | URL slug from text | Full implementation: normalize, diacritics strip, collapse separators | Empty input, Unicode | Labels, aria-live | Fine (textarea) | New tests added | Production-ready |
| text-sorter | Sort lines A-Z/Z-A/numeric | Full implementation: Intl.Collator, numeric fallback | Empty input, Unicode | Labels, aria-live | Fine (textarea) | New tests added | Production-ready |
| uuid-generator | RFC4122 v4 UUIDs | crypto.randomUUID(), configurable count 1-100 | Format validation | Labels, aria-live | Fine | New tests added | Production-ready |
| base-converter | Hex/Oct/Dec/Bin | BigInt-based, strict validation per base | Invalid digits | Labels, aria-live | Fine | New tests added | Production-ready |
| contrast-checker | WCAG contrast ratio | WCAG 2.1 luminance formula, AA/AAA thresholds | Color parsing | Text results (not color-only) | Fine | New tests added | Production-ready |

## Changes By Tool

### 1. slug-generator
- **Status**: coming-soon → functional
- **Implementation**: `runSlugGenerate()` in GenericUtilityWorkspace.tsx
- **Logic**: Unicode NFD normalization → strip diacritics → lowercase → remove non-alphanumeric → spaces to hyphens → collapse hyphens → trim
- **UI**: Single action button "Generate URL Slug" in Template A
- **Tests**: Unit tests for normal English, punctuation, repeated spaces, accented text, emoji, leading/trailing, empty input

### 2. text-sorter
- **Status**: coming-soon → functional
- **Implementation**: `runTextSort(mode)` in GenericUtilityWorkspace.tsx
- **Logic**: Intl.Collator with sensitivity:'base' for alphabetical; parseFloat for numeric; stable sort
- **UI**: 4 action buttons: A→Z, Z→A, Numeric ↑, Numeric ↓
- **Tests**: Unit tests for alphabetical, numerical, duplicates, blank lines, Unicode, case differences

### 3. uuid-generator
- **Status**: coming-soon → functional
- **Implementation**: `runUuidGenerate()` in GenericUtilityWorkspace.tsx
- **Logic**: `crypto.randomUUID()` — browser-native Web Crypto API, RFC4122 v4 format
- **UI**: Count input (1-100, default 5) + "Generate UUIDs" button
- **Tests**: Unit tests for format validation, uniqueness, count bounds

### 4. base-converter
- **Status**: coming-soon → functional
- **Implementation**: `runBaseConvert()` in GenericUtilityWorkspace.tsx
- **Logic**: BigInt for arbitrary precision, `.toString(base).toUpperCase()`, strict digit validation per base
- **UI**: From/To base selectors (Binary/Octal/Decimal/Hex) + "Convert" button
- **Tests**: Unit tests for 0, decimal↔binary, decimal↔hex, binary↔hex, large integers, invalid digits, negative policy, empty input

### 5. contrast-checker
- **Status**: coming-soon → functional
- **Implementation**: `runContrastCheck()` in GenericUtilityWorkspace.tsx
- **Logic**: WCAG 2.1 relative luminance formula, contrast ratio = (L1+0.05)/(L2+0.05), AA (4.5:1 normal, 3:1 large), AAA (7:1 normal, 4.5:1 large)
- **UI**: Foreground/Background hex inputs + "Check Contrast" button
- **Tests**: Unit tests for black on white (21:1), same color (1:1), known WCAG thresholds, invalid colors

## Tests Added

### Unit Tests (new file: tests/p2a2-tools.test.ts)
- slug-generator: 7 tests (normal, punctuation, repeated spaces, accented, emoji, leading/trailing, empty)
- text-sorter: 6 tests (A-Z, Z-A, numeric asc/desc, duplicates, Unicode)
- uuid-generator: 4 tests (format, uniqueness, count bounds, empty input edge)
- base-converter: 7 tests (zero, dec↔bin, dec↔hex, bin↔hex, large int, invalid, empty)
- contrast-checker: 5 tests (black/white, same color, AA/AAA thresholds, invalid)

### Existing Test Updates
- tests/registry.test.ts: functional 17→22, coming-soon 51→46, public catalog 17→22, hidden 96→91
- tests/seo.test.ts: nonIndexable count 96→91

### E2E
- Existing E2E "interacts with functional tools without console errors" now exercises all 22 functional routes
- Existing E2E "text functional tools complete core browser workflows" covers the new text tools

## Existing 22-Tool Regression

All 22 functional tools verified:
- Image: image-converter, color-extractor
- PDF: pdf-compiler
- Text: case-converter, word-counter, lorem-ipsum, line-remover, json-formatter, base64-coder, url-coder, html-entities, text-reverser, morse-translator, slug-generator, text-sorter
- Developer: uuid-generator, base-converter, contrast-checker
- Math: percent-calc, tip-calc
- Games: dice-roller, rock-paper-scissors

## Performance Impact

| Metric | P2-A1 Baseline | P2-A2 | Delta |
|--------|---------------|-------|-------|
| Main JS (index) | 216 KB | 211 KB | -5 KB |
| GenericUtilityWorkspace (lazy) | 127.5 KB | 124.5 KB | -3 KB |
| CSS | 93.9 KB | 93.9 KB | 0 |
| Total lazy JS | ~1,100 KB | ~1,117 KB | +17 KB |
| Total assets | 1,594 KB | 1,611 KB | +17 KB |

All 5 new tools are code paths inside the existing GenericUtilityWorkspace lazy chunk — no new chunks created. Initial JS decreased slightly due to build optimization.

## Security/Privacy

- All 5 tools process browser-local only
- No network requests made
- No unsafe eval/Function used
- No secrets exposed
- No new external processors
- uuid-generator uses `crypto.randomUUID()` (Web Crypto API)
- base-converter uses `BigInt` (no precision issues)
- contrast-checker uses pure math (WCAG luminance formula)

## Updated Registry Totals

| Status | Before (P2-A1) | After (P2-A2) | Delta |
|--------|----------------|---------------|-------|
| Functional | 17 | **22** | +5 |
| Beta | 25 | 25 | 0 |
| Coming Soon | 51 | **46** | -5 |
| Disabled | 20 | 20 | 0 |
| **Total** | **113** | **113** | **0** |

## Sitemap/Prerender Totals

| Metric | Before | After | Delta |
|--------|--------|-------|-------|
| Sitemap URLs | 18 | **23** | +5 |
| Prerendered indexable pages | 17 | **22** | +5 |
| Prerendered noindex pages | 96 | **91** | -5 |

## Icon Map Updates

New icons added to `App.tsx`:
- `Lightning` (uuid-generator)
- `Shuffle` (base-converter)
- `Eye` (contrast-checker)

## Template Changes

- Template A condition expanded: `tool.category === 'Developer Tools'` now triggers the text/code template alongside `Text & Writing`
- 5 new tool-specific action blocks added to Template A action strip

## Remaining Roadmap

### P2-A3 — Math/Health Calculators (next batch)
- unit-converter (needs bidirectional conversion)
- bmi-calc (needs custom input fields)
- age-calc (needs next birthday fix)

### P2-A4 — Data Conversion
- csv-to-json (needs proper CSV parser)
- json-to-csv (needs nested object handling)
- markdown-to-html (needs Markdown library)

### Future
- color-blender (needs custom color picker UI)
- password-gen (needs crypto.getRandomValues rewrite)
- hash-generator (needs honest labeling)
