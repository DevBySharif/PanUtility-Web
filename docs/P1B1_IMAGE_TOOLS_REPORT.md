# P1B1 — Image Tools Audit & Improvement Report

Scope: Image Converter, Color Extractor, and PDF Compiler only.

## 1. Audit summary

All three tools are fully client-side (zero cost, no backend dependency), preserve
SEO/prerendering, and use no external services. The audit found **no critical or
security defects**, but several real behavioral bugs, resource leaks, validation gaps,
and accessibility issues were confirmed in code:

### Confirmed issues (before fixes)

| # | Tool | Severity | Issue |
|---|------|----------|-------|
| 1 | Image Converter | High | `URL.createObjectURL` results leaked. The unmount cleanup captured stale `previewUrl`/`convertedUrl` values (stale closure), so earlier URLs were never revoked and the cleanup array could detach incorrectly. |
| 2 | Image Converter | High | Converted URL was replaced on each conversion without revoking the previous blob, leaking memory during batch operations. |
| 3 | Image Converter | Medium | No shared validation; empty files / non-image MIME were accepted in some paths and failed later with confusing behavior. |
| 4 | Image Converter | Medium | Resize math inlined and duplicated (component-local), with inconsistent dimensions rounding vs. the PDF compiler. |
| 5 | Color Extractor | High | Stale async image loads could race: a slow `onload` from an old image could overwrite the state of a newly-selected image. |
| 6 | Color Extractor | Medium | Cluster percentages were computed with `nonTransparentPixels || 1600`, so the denominator default was wrong for large images (percentages could be wildly off / exceed ~100%). |
| 7 | Color Extractor | Medium | Drop zone was advertised in the UI but had **no `onDrop`/`onDragOver` handlers** — drag-and-drop did nothing. |
| 8 | Color Extractor | Low | `copyToClipboard` had no failure path; a rejected `navigator.clipboard` promise produced an unhandled rejection with no user feedback. |
| 9 | Color Extractor | Low | No explicit file validation (`Invalid Image` / `File Too Large` feedback was never surfaced). |
| 10 | PDF Compiler | High | Decode failures (files that load but cannot be drawn to canvas) were silently swallowed and reported as "compiled with 100% success" — users saw success despite missing pages. |
| 11 | PDF Compiler | Medium | Page geometry and draw-rect math inlined, duplicated, and used inconsistent rounding with the converter. |
| 12 | PDF Compiler | Medium | No shared size/limit validation; no filename sanitization for the download name. |
| 13 | All three | Medium | Icon-only and interactive elements lacked `aria-label`, labelled inputs lacked `htmlFor`, and dropzones were not keyboard-operable. |

## 2. Files changed

### New files
- `src/lib/imageTools.ts` — pure, deterministic helpers shared by all three tools
  (validation, filename building, size formatting, geometry, color clustering, PDF page math).
- `tests/image-tools.test.ts` — 46 deterministic unit tests for the helpers.
- `docs/P1B1_IMAGE_TOOLS_REPORT.md` — this report.

### Modified (in scope)
- `src/components/ImageConverter.tsx`
- `src/components/ColorExtractor.tsx`
- `src/components/PdfCompiler.tsx`
- `tests/functional-tools.test.tsx` (8 new interaction tests)

### Pre-existing in-flight changes (not authored here; do not commit without review)
- `src/components/GenericUtilityWorkspace.tsx`
- `src/lib/toolTransforms.ts`
- `tests/e2e/catalog.spec.ts`

## 3. Fixes implemented

### Shared helper module — `src/lib/imageTools.ts`
- `IMAGE_TOOL_LIMITS`: 50 MB max, 50 files max, 16384 px max dimension (single source of truth).
- `IMAGE_EXTENSION_PATTERN` for extension-based type detection.
- `validateImageFile(file)` → typed result (`EMPTY`, `TOO_LARGE`, `UNSUPPORTED`, `OK`) with a
  `message` and `fileName` for toasts. One validation path across all three tools.
- `buildConvertedFileName(name, format)` — deterministic rename with sanitized stem.
- `formatFileSize(bytes)` / `formatSizeDelta(...)` — consistent, tested formatting.
- `computeOutputDimensions(w, h, { mode, width, height, format })` — converter resize math.
- `extractDominantColors` / `isFullyTransparent` — deterministic k-means-style clustering
  (factor 32, top 6, alpha threshold 128) replacing the inline implementation.
- `computePageDimensions(size, orientation)` + `computeDrawRect(...)` — PDF geometry.
- `sanitizePdfTitle(...)` — safe download/placeholder naming.

### Image Converter
- Added `imagesRef` + real unmount cleanup that revokes every outstanding object URL
  (fixes #1). Conversion now revokes the previous converted URL before replacing it (#2).
- Shared `validateImageFile` replaces ad-hoc checks (#3).
- Uses `computeOutputDimensions` (#4) and `buildConvertedFileName`.
- `handleConvertAll` skips in-progress items and early-returns when nothing is pending.
- Accessibility (#13): labelled quality slider, aria-labels on dimension inputs, keyboard
  + focus-ring dropzone (`role="button"`), aria-labels on convert/download/delete buttons.

### Color Extractor
- Added `processingTokenRef` — every async image load checks the token before writing
  state; `clearWorkspace` bumps the token to cancel in-flight loads (fixes #5).
- Percentages now use the real `nonTransparentPixels` count (fixes #6).
- Functional `onDrop`/`onDragOver` handlers added (fixes #7).
- `copyToClipboard` is async with a try/catch and failure toast (fixes #8).
- Shared validation surfaced as `Invalid Image` / `File Too Large` toasts (fixes #9).
- Accessibility: keyboard + focus-ring dropzone; swatch cards are focusable with labels.

### PDF Compiler
- Added `itemsRef` + `compiledUrlRef` unmount cleanup for object URLs.
- Shared `validateImageFile` for per-file validation.
- `computePageDimensions` / `computeDrawRect` replace inline math (fixes #11).
- Tracks `skippedCount` for files that decode but fail to draw; the toast now reports an
  honest "compiled with N skipped" warning instead of fake 100% success (fixes #10).
- `sanitizePdfTitle` for the download filename and input placeholder (fixes #12).
- Accessibility: labelled file-name input, keyboard dropzone, aria-labels on reorder/delete.

## 4. Tests added

- `tests/image-tools.test.ts` — **46 tests**: file validation matrix (empty / too large /
  unsupported extension / ok), filename sanitization, size formatting boundaries
  (`500 B`, `1.0 KB`, `5.0 MB`), output-dimension modes, dominant-color extraction,
  fully-transparent detection, PDF page dimensions (A4/Letter/original × orientations),
  draw-rect math, PDF title sanitization.
- `tests/functional-tools.test.tsx` — **8 new tests**: keyboard-activatable labelled
  dropzones for all three tools; invalid-file toasts (`Unsupported Format`,
  `Empty File Skipped`); Color Extractor drop validation (`Invalid Image`) and
  oversized-file toast (`File Too Large`); disabled Convert-All / Compile buttons.

## 5. Verification results (current branch, clean rebuild)

| Command | Result |
|---------|--------|
| `npm install` | ok, 0 vulnerabilities (586 packages) |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm run test` | **210 passed** (15 files) — was 156 / 14 files at baseline |
| `npm run build` | pass; prerendered homepage + 42 indexable tool pages; server bundle built |
| `npm run check` | exit 0 |

Note: `dist/` and `server-dist/` are gitignored. A stale `dist/` breaks the SEO tests
(`tests/seo.test.ts`); run `npm run build` before `npm run test` on a fresh machine.

## 6. Remaining limitations

- **HEIC/HEIF** conversion depends on the browser's native decode support (as before).
- `formatFileSize` shows one decimal for sub-10 values (e.g. `5.0 MB`); sub-KB values show
  `B`. Deliberate, documented in tests.
- `sanitizePdfTitle` / `buildConvertedFileName` collapse multiple dots to underscores
  (e.g. `my.photo.PNG` → `my_photo_converted.png`) — deterministic but surprising; callers
  choose whether to keep the original display name.
- Dominant-color extraction is a perceptual approximation (cluster of the top-6 most
  frequent colors at factor 32); it is deterministic but not a perceptual quantizer.
- Canvas re-encoding uses browser defaults for `toBlob` quality per format; output size
  is not normalized across browsers.
- Percent rounding may produce a small residual (<1%) in the palette row; totals are
  rounded per swatch.

## 7. Recommended follow-ups (out of scope for P1B1)

- Move the three tools' shared copy/limit strings into `src/lib/` so test snapshots and
  components read from one source.
- Add E2E coverage for drag-and-drop with real `File` objects (Playwright).
- Review and commit the pre-existing in-flight diffs
  (`GenericUtilityWorkspace.tsx`, `toolTransforms.ts`, `catalog.spec.ts`) separately.
