# P1-B Public catalog visibility cleanup report

**Date:** 2026-08-04 · **Scope:** P1-B public visibility · **No P1-B2 work started.**

## Objective

Make only **functional** (production-ready) tools visible on every public discovery surface, while preserving all 113 stable route IDs, the 12/30/51/20 status totals, the P1-B1 image-tool fixes, and the P0 security baseline. `social-downloader` was **not** inspected or modified.

## What changed

### Source of truth — `src/toolsData.ts`

- `isIndexable` is now `status === 'functional'` (was: everything except disabled/coming-soon, which included beta).
- `isFeatured` is now `status === 'functional' && Boolean(badge)` for consistency.
- New selectors: `FUNCTIONAL_TOOLS`, `PUBLIC_TOOLS` (12), `HIDDEN_TOOLS` (101), `PUBLIC_TOOL_IDS`.
- `TOOL_REGISTRY` / `TOOLS_LIST` / `TOOL_BY_ID` / `isToolId` unchanged — all 113 routes resolve.

### UI — `src/App.tsx`

| Surface | Before | After |
|---|---|---|
| Homepage grid + search | 113 cards | 12 cards (`PUBLIC_TOOLS`) |
| Category chips | 9 static categories | Only categories with functional tools (Video/Audio/Health removed) |
| File-routing suggestions | functional + beta | functional only |
| Keyboard shortcuts | any of 113 | public tools only |
| Pinned workspaces | any stored id | stale/non-public pins filtered out |
| Global drag-and-drop overlay | audio/video/other targets named `audio-trimmer` & `video-splitter` | image-only targets (`image-converter`, `pdf-compiler`, `color-extractor`); non-image drops show "No production-ready tool is currently available for this file type." |
| Dashboard drop-zone routing | empty list on no match | explicit no-tool message |
| Search placeholder | "MagnifyingGlass tools by name…" (leftover component name) | "Search tools by name, description, category…" |

### SEO / prerender

- `INDEXABLE_TOOLS` = 12 → sitemap = 13 URLs, prerender = 12 pages (both scripts derive from `INDEXABLE_TOOLS`, only comments updated).
- Hidden (beta/coming-soon/disabled) routes now emit `noindex, nofollow` and never appear in sitemap/prerender/related-tools lists.

## Verification (all green)

| Gate | Result |
|---|---|
| `npm.cmd install` | ok (no changes; audit-only) |
| `clean` + `build:client` + `build:server` + `build` | pass; sitemap 13 URLs (12 tools), 12 prerendered tool pages |
| `typecheck` (`tsc --noEmit`) | 0 errors |
| `lint` | 0 errors |
| `test` (Vitest) | **212/212** in 15 files |
| `test:e2e` (Playwright, production build) | **14/14** including new homepage-visibility + search-visibility tests |
| `check` | pass |
| `npm audit --json` | 0 critical/high; 1 moderate pre-existing (see below) |

### New tests added

- `tests/registry.test.ts` — public selector counts (12/101), functional-only indexable/featured, `PUBLIC_TOOL_IDS` invariant.
- `tests/seo.test.ts` — sitemap length derived from `INDEXABLE_TOOLS`; 101 non-functional tools strictly excluded from indexability, featured status, and prerender.
- `tests/e2e/catalog.spec.ts` — homepage shows only public functional tools; search does not surface hidden tools.

## Known finding (pre-existing, not part of this task)

`npm audit` reports 1 moderate transitive advisory: `postcss <=8.5.22` (`GHSA-fxqj-rqcc-2cmp`, path traversal / info exposure), `fixAvailable: true`. `package.json`/`package-lock.json` were untouched by this task. Follow-up: update the `postcss` transitive dependency (e.g. `npm audit fix`) in a dedicated dependency commit.

## Deferred / untouched

- `src/components/GenericUtilityWorkspace.tsx` and `src/lib/toolTransforms.ts` remain **uncommitted pre-existing modifications** from earlier work (they power the functional text/math/game tools). Left for a dedicated review.
- `docs/MEDIA_DOWNLOADER_AUDIT.md` (separate audit) — not modified.
- `social-downloader`, `video-splitter`, `audio-trimmer`, `audio-transcriber` — not modified, not promoted, not mentioned in public copy.

## Preservation guarantees (re-verified)

- All 113 `/tools/<id>` routes resolve through `isToolId` / `TOOL_BY_ID`.
- Status totals unchanged: 12 functional / 30 beta / 51 coming-soon / 20 disabled.
- Hidden routes render truthful `ComingSoonTool` / `DisabledTool` pages and never mount executable code.
