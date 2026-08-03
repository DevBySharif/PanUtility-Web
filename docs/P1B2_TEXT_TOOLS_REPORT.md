# P1B2 — Text & Writing Tools Audit & Improvement Report

Scope: Case Converter, Word Counter, Lorem Ipsum Generator, Duplicate Line Remover, and
JSON Formatter (the shared `GenericUtilityWorkspace` text/code transform path plus the
`src/lib/toolTransforms.ts` transform library). Bonus in-scope hardening: `percentageOf`,
`splitTip`, `secureRandom`, `rollDie`, and `playRockPaperScissors` (transforms already
changed under this task and covered by the shared test suite).

## 1. Audit summary

All five tools are fully client-side (zero cost, no backend dependency), preserve
SEO/prerendering, and use no external services. The audit confirmed several real
behavioral defects that were resolved:

| # | Tool | Severity | Issue (before fix) |
|---|------|----------|--------------------|
| 1 | Case Converter | High | Title/sentence case used ASCII `\w` regex, corrupting accented words; camel/snake split on a lossy regex that mangled punctuation and Unicode. No PascalCase or kebab-case modes despite the tool claiming "and more". |
| 2 | Case Converter | Medium | No empty-input guard; word-based modes could throw or return garbage on empty/punctuation-only input. |
| 3 | Word Counter | High | Word count fell back to whitespace splitting, so punctuation-only input was counted as 1 word; characters used `.length` (UTF-16 units), undercounting emoji. Paragraphs stat was dropped from the output. |
| 4 | Word Counter | Medium | No reading-time estimate label; whitespace-only text counted lines/words incorrectly. |
| 5 | Lorem Ipsum | High | The UI generated output inline with `Math.random()`, so output was non-deterministic, used a tiny ad-hoc word pool, and emitted a malformed trailing `.\n\n` structure. |
| 6 | Lorem Ipsum | Medium | UI max was 10 paragraphs while the library clamped to 20 — the UI and library limits disagreed. |
| 7 | Line Remover | High | The UI used `new Set(lines.map(l => l.trim()))` — it **silently trimmed** whitespace and **silently removed blank lines**, violating the "never silently alter formatting" rule. The library `removeDuplicateLines` also defaulted `trim: true` and `removeEmpty: true`. |
| 8 | Line Remover | Medium | No visibility into or control over trim / blank-line / case-sensitivity behavior. |
| 9 | JSON Formatter | Medium | No empty-input guard, no minify mode, no size limit, and errors leaked raw `JSON.parse` messages. |
| 10 | Dice / RPS / Tip / Percent | Low | `rollDie`/RPS used `Math.random` (non-crypto); `splitTip`/`percentageOf` had floating-point noise and weak validation. |

## 2. Files changed

### Modified (in scope)
- `src/lib/toolTransforms.ts` — transform library (see §3).
- `src/components/GenericUtilityWorkspace.tsx` — text-tool wiring + controls (see §3).
- `tests/functional-tools.test.tsx` — extended deterministic coverage (+28 tests).
- `docs/P1B2_TEXT_TOOLS_REPORT.md` — this report.

### New files
- `tests/text-tools-workspace.test.tsx` — 7 UI-level workspace tests (lorem generate/
  copy/reset, word-counter live stats, line-remover option controls, case-converter
  Pascal/kebab buttons).

### Pre-existing in-flight changes (retained and completed by this task)
- `src/lib/toolTransforms.ts` and `src/components/GenericUtilityWorkspace.tsx` already
  carried uncommitted work (JSON minify, reading time, crypto helpers). This task
  completed, extended, and verified that work rather than reverting it.

## 3. Fixes implemented

### Case Converter — `convertCase` (all modes via the shared helper)
- Title case now uses Unicode-aware `(\p{L})([\p{L}\p{N}]*)` — accents and CJK are
  preserved and capitalized correctly (`café au lait` → `Café Au Lait`).
- Sentence case now uses `(^\s*|\b[.!?]\s+)(\p{L})`.
- Word-based modes split on `\p{L}+|\p{N}+` (Unicode-safe), then:
  - `camelCase` (first word lower, rest capitalized),
  - `PascalCase` (new — all words capitalized),
  - `snake_case`,
  - `kebab-case` (new).
- Emoji and punctuation are dropped from identifier-style outputs (documented), and
  punctuation-only input is returned unchanged. Empty input returns `''` for all modes.
- `capitalizeWord` uses `Array.from` so supplementary-plane letters capitalize correctly.

### Word Counter — `countText`
- Word counting uses a Unicode-aware regex; **punctuation-only and whitespace-only input
  now count as 0 words** (the old whitespace fallback counted them as 1).
- `characters` and `charactersWithoutSpaces` use `Array.from(value)` so emoji and other
  astral code points are counted as 1 each (not split into surrogate halves).
- **Paragraphs restored**: counted as non-empty blocks separated by blank lines
  (`countParagraphs` scans lines; a blank/whitespace line closes a paragraph).
- Reading time is `Math.ceil(words / 200)` labeled `N min read (est.)`; `0 min read` when
  there are no words. Lines split on `\r?\n` for CRLF compatibility.
- The workspace output now reports Words, Characters, Characters (no spaces), Lines,
  Paragraphs, and Reading Time.

### Lorem Ipsum — `generateLorem`
- All inline `Math.random()` generation removed. The UI calls the shared deterministic
  `generateLorem(sliderVal)`.
- Deterministic: the same paragraph count always produces the identical string (seeded
  index rotation over a fixed 8-sentence pool, 3–5 sentences per paragraph).
- Bounds: clamped to 1–20 paragraphs; `NaN`, negatives, and non-integers clamp to 1.
- Paragraphs are separated by exactly one blank line (`\n\n`) with no trailing newline.
- **UI limit aligned with the library**: the count input now uses `min=1 max=20` and the
  same clamp, matching the library's 1–20 bound (previously 1–10 vs 1–20).

### Line Remover — `removeDuplicateLines` + controls
- The inline `new Set(...trim...)` logic in the workspace was replaced with the shared
  `removeDuplicateLines(input, options)` helper.
- **Defaults changed to non-destructive**: `trim: false`, `removeEmpty: false` — no
  silent trimming, no silent blank-line removal. `caseSensitive: true`.
- Explicit UI checkboxes now control: **Trim whitespace**, **Remove blank lines**, and
  **Case-sensitive**; the current behavior is displayed as a status line, and the sandbox
  log records the selected behavior.
- First occurrence and original order are always preserved.

### JSON Formatter — `formatJson`
- Empty/whitespace input rejected with `Please enter valid JSON text to format.`
- Strict `JSON.parse` only (no eval); errors wrapped as `JSON Syntax Error: <detail>`.
- `format` (2-space indent) and new `minify` modes; workspace exposes both buttons.
- 5 MB safety limit with a clear error.
- Unicode content preserved on round-trip.

### Bonus transforms (hardened under this task)
- `percentageOf` rounds to 6 decimals and validates finiteness.
- `splitTip` rounds to cents, validates bill ≥ 0, tip ≥ 0, and a positive integer people
  count.
- `secureRandom` uses `crypto.getRandomValues` when available; `rollDie` and
  `playRockPaperScissors` default to it and validate their inputs.

## 4. Tests added

- `tests/functional-tools.test.tsx` — **+28 deterministic tests** (now 69 in the file):
  - Case Converter: PascalCase/kebab-case; emoji preservation vs identifier-style modes;
    mixed scripts/Unicode; empty input across all 8 modes; punctuation-only input.
  - Word Counter: punctuation-only → 0 words; whitespace-only; paragraph blocks; CJK
    runs; emoji-only; 10,000-word bounded input.
  - Lorem Ipsum: determinism; min/max/non-numeric clamping; paragraph separation with no
    trailing newline; stable copy-ready output.
  - Line Remover: no-trim/no-blank-drop defaults; order preservation; option matrix
    (trim, removeEmpty, caseSensitive); Unicode/Cyrillic/CJK dedup.
  - JSON Formatter: Unicode preservation; format/minify round-trip; top-level
    non-object values; 5 MB limit; existing empty/invalid coverage retained.
  - Bonus: `secureRandom` range; crypto-backed `rollDie` bounds.
- `tests/text-tools-workspace.test.tsx` — **7 new UI tests** rendering the real
  `GenericUtilityWorkspace`: lorem generate determinism + Copy-to-clipboard + Clear Fields
  reset; 1..20 UI bound; word-counter live paragraphs/reading time; line-remover default
  vs option behavior; case-converter Pascal/kebab buttons.
- Total suite: **247 tests across 16 files** (was 210 / 15 at the P1B1 baseline).

## 5. Verification results (current branch, clean rebuild)

| Command | Result |
|---------|--------|
| `npm.cmd install` | ok; audited 586 packages |
| `npm.cmd run clean` | ok |
| `npm.cmd run typecheck` | pass, exit 0 |
| `npm.cmd run lint` | pass, exit 0 |
| `npm.cmd run test` | **247 passed** (16 files) |
| `npm.cmd run build:client` | pass; sitemap 13 URLs (12 indexable); prerender ok |
| `npm.cmd run build:server` | pass; `server-dist/server.cjs` |
| `npm.cmd run build` | pass (combined build) |
| `npm.cmd run test:e2e` | **14 passed** |
| `npm.cmd run check` | exit 0 (ordered typecheck, lint, Vitest, production build) |
| `npm.cmd audit --json` | 0 critical, 0 high, 0 low; 1 **moderate** (dev-only `postcss`, pre-existing) |

The client build retains the pre-existing >500 kB main-chunk warning
(`index-*.js` 642.15 kB / 178.24 kB gzip). This is known performance debt tracked under
P2, unrelated to this task's changes.

## 6. Remaining limitations

- **Case Converter**: word-based modes (`camel`/`pascal`/`snake`/`kebab`) do not split on
  existing camelCase or PascalCase boundaries (e.g. `helloWorld` stays one word). This is
  a deliberate, documented behavior; splitting on mixed-case boundaries is a possible
  follow-up.
- **Word Counter**: reading time is a fixed 200-wpm estimate, clearly labeled "(est.)".
  Emoji sequences of multiple code points each count as one character (grapheme clusters
  such as ZWJ families are not grouped).
- **Line Remover**: case-insensitive comparison uses `toLowerCase()`, which is correct for
  most scripts but not full Unicode case folding (e.g. German `ß`/`SS`).
- **JSON Formatter**: 5 MB safety limit counts UTF-16 code units, not bytes; deeply nested
  JSON is parsed by the host engine (no custom recursion limit).
- **Lorem Ipsum**: fixed 8-sentence pool means output cycles after 24 paragraphs (max is
  20, so no duplication of the same paragraph index within a single run, but the pool is
  intentionally small and Latin-only).
- One pre-existing moderate audit finding remains (dev-only `postcss <=8.5.22`); it is a
  build-toolchain advisory, not an application runtime issue, and was not introduced here.

## 7. Confirmed untouched

Per task constraints, this task did **not** modify: image tools, SEO/prerendering,
public-visibility selectors, API/security, `social-downloader`, unrelated Beta/Disabled
tools, route IDs, or status totals. The enforced catalog totals (12 functional, 30 beta,
51 coming soon, 20 disabled = 113 routes), the public catalog policy, and the zero-cost
production mode are unchanged and verified by the existing `registry`, `seo`, and
`availability` test files, all of which still pass.

## 8. Recommended follow-ups (out of scope for P1B2)

- Split existing camelCase/PascalCase boundaries in word-based case modes.
- Add grapheme-cluster-aware character counting (e.g. `Intl.Segmenter`).
- Use full Unicode case folding for the line-remover case-insensitive option.
- Move the remaining text/code tools (diff, markdown, regex, slug, sorter, find/replace,
  morse, binary, base64, url, entities, reverser) onto the same shared transform pattern.
- Track P1-B3 separately; do not begin until P1-B2 is committed and verified.
