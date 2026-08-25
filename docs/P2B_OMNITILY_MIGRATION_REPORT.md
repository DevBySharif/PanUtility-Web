# P2-B: Omnitily Brand Migration Report

**Date:** 2026-08-25
**Scope:** Public-facing brand identity migration from PanUtility to Omnitily
**Production domain:** https://omnitily.vercel.app
**GitHub repository:** https://github.com/DevBySharif/omnitily-Web.git

---

## Summary

Migrated all public-facing brand identity across the codebase, SEO surfaces, production config, server-side metadata, and deployment tooling from **PanUtility** to **Omnitily**. The local directory name (`PanUtility-Web`) was intentionally preserved per owner instructions.

---

## Files Changed (25 modified)

### Root Config
| File | Change |
|------|--------|
| `index.html` | Title, meta author, canonical URL, OG, Twitter card → Omnitily + `omnitily.vercel.app` |
| `.env.example` | `ALLOWED_ORIGINS` default → `omnitily.vercel.app` |
| `README.md` | Title, description, CORS reference → Omnitily |

### Source (src/)
| File | Change |
|------|--------|
| `src/App.tsx` | Header brand "PanUtility Core" → "Omnitily Core", footer text, error boundary messages |
| `src/components/SeoManager.tsx` | DOMAIN constant, all JSON-LD schema names, og:site_name, data-seo attributes, disclosure text |
| `src/components/ToolWorkspace.tsx` | itemProp URLs → `omnitily.vercel.app` |
| `src/components/ToolAvailability.tsx` | "PanUtility catalog" → "Omnitily catalog" |
| `src/components/AudioTranscriber.tsx` | Disclosure text → Omnitily server |
| `src/components/SocialDownloader.tsx` | Disclosure text → Omnitily server |
| `src/toolsData.ts` | Privacy notice → Omnitily |

### Server (lib/)
| File | Change |
|------|--------|
| `lib/config.ts` | Default CORS origins → `omnitily.vercel.app` |
| `lib/security/outbound.ts` | User-Agent string → Omnitily |
| `lib/security/rateLimit.ts` | Redis key prefix → `omnitily:` |

### Scripts
| File | Change |
|------|--------|
| `scripts/prerender.ts` | DOMAIN constant, brand name, data-seo attribute |
| `scripts/generate-sitemap.ts` | baseUrl → `omnitily.vercel.app` |
| `scripts/start-production-test.mjs` | ALLOWED_ORIGINS → `omnitily.vercel.app` |

### Public Assets
| File | Change |
|------|--------|
| `public/robots.txt` | Sitemap URL → `omnitily.vercel.app/sitemap.xml` |
| `public/site.webmanifest` | name, short_name → Omnitily |
| `public/og-image.svg` | Text label → Omnitily |
| `public/sitemap.xml` | Regenerated with 23 URLs on `omnitily.vercel.app` |

### Tests
| File | Change |
|------|--------|
| `tests/seo.test.ts` | All domain expectations → `omnitily.vercel.app` |
| `tests/deployment-api.test.ts` | Origin → `omnitily.vercel.app` |
| `tests/deployment-config.test.ts` | Origin → `omnitily.vercel.app` |
| `tests/vercel-runtime-regression.test.ts` | Origin → `omnitily.vercel.app` |
| `tests/e2e/catalog.spec.ts` | Brand expectations → Omnitily |

---

## SEO / Canonical Migration

- **Canonical domain:** `https://omnitily.vercel.app/`
- **Tool canonicals:** `https://omnitily.vercel.app/tools/{toolId}`
- **OG/Twitter metadata:** All pointing to `omnitily.vercel.app`
- **JSON-LD WebSite schema:** `name: "Omnitily"`, `url: "https://omnitily.vercel.app/"`
- **JSON-LD Organization schema:** `name: "Omnitily"`
- **Breadcrumb schema:** Updated to Omnitily
- **data-seo cleanup attribute:** `panutility-jsonld` → `omnitily-jsonld`

## Sitemap / Robots Migration

- **Sitemap:** 23 URLs (22 indexable tools + homepage), all using `https://omnitily.vercel.app`
- **robots.txt:** `Sitemap: https://omnitily.vercel.app/sitemap.xml`

## Configuration / CORS Migration

- **ALLOWED_ORIGINS default:** `https://omnitily.vercel.app`
- **Deployment tests:** Verify `omnitily.vercel.app` as allowed origin
- **CORS rejection:** `omnitily.vercel.app.evil.example`, random origins, HTTP, port variants all rejected

## Registry Invariants (unchanged)

| Metric | Count |
|--------|-------|
| Total routes | 113 |
| Functional | 22 |
| Beta | 25 |
| Coming Soon | 46 |
| Disabled | 20 |

---

## Intentionally Preserved References

### localStorage Compatibility Keys
- `panutility-theme` — theme preference key
- `panutility-pinned-tools` — pinned tools key

These are **legacy compatibility identifiers**, not current branding. They are preserved so existing users do not lose their preferences on migration. Changing them would be a breaking change.

### Historical Documentation
The following `docs/` files retain their original PanUtility/panutility.vercel.app references as historically accurate records of prior states:
- `P1A_SEO_REPORT.md`
- `P1A2_PRODUCTION_SEO_REPORT.md`
- `P1D_LAUNCH_READINESS_REPORT.md`
- `FULL_PRODUCTION_AUDIT.md`
- `PROJECT_AUDIT.md`
- `IMPLEMENTATION_ROADMAP.md`
- `DEPLOYMENT.md`
- `ZERO_COST_DEPLOYMENT.md`
- `PROVIDER_POLICY.md`
- `PRIVACY_PROCESSING_MATRIX.md`
- `TOOL_INVENTORY.md`

These are not rewritten to achieve zero grep matches.

### Test Data
- `tests/functional-tools.test.tsx` uses "PanUtility" as an arbitrary JSON string value in formatter tests. This is test data, not branding.

---

## Verification Results (pre-push)

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | Clean |
| ESLint | Clean |
| Tests | 311/311 pass, 18/18 test files |
| `npm run check` | Pass (tests + build + prerender + sitemap) |
| `verify:deployment` (local) | 16/17 (1 CORS pending redeploy) |
| dist/ HTML old brand references | Zero |

---

## Remaining Risks / Actions

1. **Production deployment:** Push triggers Vercel auto-deploy. Must verify 17/17 after deployment completes.
2. **CORS verification:** Must pass with `omnitily.vercel.app` as allowed origin on live production.
3. **Live brand verification:** Must confirm all production HTML serves Omnitily branding.
4. **Sitemap verification:** Must confirm 23 URLs on live production.

---

## Commit

- **Message:** `Migrate PanUtility brand to Omnitily`
- **Branch:** `main`
- **Pre-commit baseline:** 311/311 tests, 18/18 files, TypeScript clean, lint clean
