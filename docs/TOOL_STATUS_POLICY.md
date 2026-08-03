# Tool status policy

`src/toolsData.ts` is the catalog source of truth. Its 113 stable IDs drive routes, cards, search, categories, pins, badges, component selection, SEO, sitemap inclusion, formats, and processing disclosures.

After P0-B the totals are 12 functional, 31 beta, 51 coming soon, and 19 disabled. Security requirements take precedence over retaining Beta status; `social-downloader` is disabled.

| Status | Meaning | Executable | Featured/indexable |
|---|---|---:|---:|
| `functional` | Audited primary operation produces its advertised result | Yes | Eligible |
| `beta` | Useful but incomplete, limited, or provider-dependent | Yes, with Beta label | Eligible |
| `coming-soon` | Processing is not implemented | No | No |
| `disabled` | Existing behavior is unsafe, fabricated, invalid, or misleading | No | No |

Unavailable entries have `processingType: none`, no component key, no supported formats, and are guarded before lazy imports. Server/external entries require a privacy notice. Promotion requires implementation review plus deterministic happy-path and failure-path tests; UI presence or a success toast is not evidence.
