# P2-D: Social Downloaders Report

**Date:** 2026-08-25
**Milestone:** Self-hosted social downloader integration via Cobalt API

---

## Summary

Implemented four separate social media downloader tools backed by the self-hosted Cobalt API. Each platform has its own route, dedicated component, URL validation, API endpoint, and SEO metadata. All tools are currently **Beta** (hidden, noindex) until a self-hosted Cobalt instance is deployed and verified.

---

## Architecture

```
Browser → PlatformDownloader UI → POST /api/download/{platform}
                                        ↓
                                   Omnitily API Gateway
                                   (URL validation, schema checks)
                                        ↓
                                   CobaltProvider adapter
                                        ↓
                                   Self-hosted Cobalt API
                                   (COBALT_API_URL)
```

- **Browser never contacts Cobalt directly**
- **API key never exposed to frontend**
- **Provider adapter pattern** allows replacing Cobalt without rewriting UI

---

## New Route IDs

| Route ID | Platform | Status |
|----------|----------|--------|
| `youtube-downloader` | YouTube | Beta (hidden, noindex) |
| `instagram-downloader` | Instagram | Beta (hidden, noindex) |
| `tiktok-downloader` | TikTok | Beta (hidden, noindex) |
| `facebook-downloader` | Facebook | Beta (hidden, noindex) |

**Registry totals:** 117 total (was 113), 22 Functional, 29 Beta (was 25), 46 Coming Soon, 20 Disabled.

---

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `lib/providers/types.ts` | Provider interface, Cobalt response types, Platform type |
| `lib/providers/platforms.ts` | URL validation & platform detection per service |
| `lib/providers/cobalt.ts` | Cobalt API adapter implementing SocialDownloadProvider |
| `src/components/PlatformDownloader.tsx` | Reusable download UI component |
| `src/components/YouTubeDownloader.tsx` | YouTube-specific wrapper |
| `src/components/InstagramDownloader.tsx` | Instagram-specific wrapper |
| `src/components/TikTokDownloader.tsx` | TikTok-specific wrapper |
| `src/components/FacebookDownloader.tsx` | Facebook-specific wrapper |
| `tests/social-downloaders.test.ts` | 44 tests (validation, API, provider) |
| `docs/P2D_COBALT_RESEARCH.md` | Cobalt API research documentation |
| `docs/P2D_SOCIAL_DOWNLOADERS_REPORT.md` | This report |
| `docs/COBALT_SELF_HOSTING.md` | Self-hosting guide |

### Modified Files
| File | Change |
|------|--------|
| `lib/config.ts` | Added `cobaltApiUrl`, `cobaltApiKey` to AppConfig |
| `api/index.ts` | Added 4 download endpoints, Cobalt provider integration |
| `src/types.ts` | Added 4 new ToolComponentKey values |
| `src/toolsData.ts` | Added 4 tool seeds, statuses (beta), component mappings |
| `src/components/ToolWorkspace.tsx` | Added lazy imports + routing for 4 new components |
| `.env.example` | Added COBALT_API_URL, COBALT_API_KEY placeholders |
| `tests/registry.test.ts` | Updated counts: 113→117, 25→29 beta, 91→95 hidden |
| `tests/seo.test.ts` | Updated hidden tool count: 91→95 |

---

## API Endpoints

All endpoints are POST-only, JSON-only, with strict validation:

| Endpoint | Platform | Validates |
|----------|----------|-----------|
| `POST /api/download/youtube` | YouTube | hostname: youtube.com, youtu.be, music.youtube.com |
| `POST /api/download/instagram` | Instagram | hostname: instagram.com, path: /p/, /reel/, /reels/, /tv/, /stories/ |
| `POST /api/download/tiktok` | TikTok | hostname: tiktok.com, vm.tiktok.com, vt.tiktok.com |
| `POST /api/download/facebook` | Facebook | hostname: facebook.com, fb.watch |

### Request Body
```json
{
  "url": "https://...",
  "videoQuality": "1080",     // optional
  "audioFormat": "mp3",       // optional
  "downloadMode": "auto"      // optional
}
```

### Response (success)
```json
{
  "status": "tunnel",
  "url": "https://cobalt-instance/tunnel/...",
  "filename": "video.mp4",
  "requestId": "abc123"
}
```

### Response (picker)
```json
{
  "status": "picker",
  "items": [{ "type": "video", "url": "...", "thumb": "..." }],
  "audioUrl": "...",
  "audioFilename": "...",
  "requestId": "abc123"
}
```

### Response (error)
```json
{
  "error": {
    "code": "PROVIDER_ERROR",
    "message": "The download provider could not resolve this URL.",
    "requestId": "abc123"
  }
}
```

---

## Security

- **No arbitrary proxy:** `/api/proxy?url=<anything>` does NOT exist
- **Platform validation:** Only known platform hostnames accepted
- **URL credential detection:** Tokens/auth params in URLs rejected
- **HTTPS only:** HTTP URLs rejected
- **Strict schema:** Unknown fields rejected, body size limited to 16KB
- **No credential forwarding:** User auth tokens never sent to Cobalt
- **CORS:** Only production origin allowed
- **Rate limiting:** Applied via existing infrastructure
- **No dangerous code:** No eval, vm.Script, Function, or hidden browser automation

---

## Tests

**44 new tests** covering:

| Category | Tests |
|----------|-------|
| YouTube URL validation | 5 (valid, shorts, music, invalid) |
| Instagram URL validation | 5 (posts, reels, stories, invalid path) |
| TikTok URL validation | 4 (standard, vm, vt, invalid) |
| Facebook URL validation | 4 (watch, fb.watch, reel, invalid) |
| Common validations | 5 (empty, non-URL, HTTP, credentials, tokens) |
| Platform detection | 6 (all platforms + unknown + non-URL) |
| Cobalt provider | 2 (configured/not configured) |
| API endpoints | 13 (method, content-type, schema, platform match, valid URL, no key, not configured) |

---

## Cobalt Research

- **Version reviewed:** v11.7.1
- **License:** AGPL-3.0
- **Our integration:** HTTP API client only — no code embedded in Omnitily
- **AGPL obligation:** Applies to the Cobalt instance, not to Omnitily
- **Auth:** API-Key or Bearer (JWT)
- **Response types handled:** tunnel, redirect, picker
- **localProcessing:** Disabled (server handles all)

---

## What Remains Before Functional Promotion

| Criterion | Status |
|-----------|--------|
| Self-hosted Cobalt deployed | **Not yet** |
| Omnitily production can reach Cobalt | **Not yet** |
| Real public-media downloads work | **Not yet** |
| Rate limiting works | **Not yet** (Cobalt-side) |
| No secrets leak | **Verified** (API key server-side only) |
| Error handling works | **Tested** |
| Representative mobile flows | **UI ready** |
| Security tests pass | **44/44 pass** |
| Production live verification | **Pending deployment** |

---

## Platform Status

| Platform | Status | Reason |
|----------|--------|--------|
| YouTube | **Beta** | No live Cobalt instance |
| Instagram | **Beta** | No live Cobalt instance |
| TikTok | **Beta** | No live Cobalt instance |
| Facebook | **Beta** | No live Cobalt instance |

All four tools will remain Beta/noindex until a self-hosted Cobalt instance is deployed, production can reach it, and real downloads are verified. They may be promoted individually.

---

## Verification

| Check | Result |
|-------|--------|
| TypeScript | Clean |
| ESLint | Clean |
| Tests | 355/355, 19/19 files |
| `npm run check` | Pass |
| Audit | 0 vulnerabilities |
| Registry | 117 total / 22 Functional / 29 Beta / 46 Coming Soon / 20 Disabled |
| Sitemap | 23 URLs (unchanged — new tools are hidden) |
