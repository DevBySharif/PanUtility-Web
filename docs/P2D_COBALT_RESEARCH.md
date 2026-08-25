# P2-D: Cobalt API Research

**Date:** 2026-08-25
**Upstream repository:** https://github.com/imputnet/cobalt
**Version reviewed:** v11.7.1
**License:** AGPL-3.0

---

## API Contract

### Endpoint: `POST /`

**Request:** `application/json`

| Key | Type | Values | Default |
|-----|------|--------|---------|
| `url` | `string` | Source URL (required) | — |
| `downloadMode` | `string` | `auto / audio / mute` | `auto` |
| `audioFormat` | `string` | `best / mp3 / ogg / wav / opus` | `mp3` |
| `audioBitrate` | `string` | `320 / 256 / 128 / 96 / 64 / 8` (kbps) | `128` |
| `videoQuality` | `string` | `max / 4320 / 2160 / 1440 / 1080 / 720 / 480 / 360 / 240 / 144` | `1080` |
| `filenameStyle` | `string` | `classic / pretty / basic / nerdy` | `basic` |
| `youtubeVideoCodec` | `string` | `h264 / av1 / vp9` | `h264` |
| `youtubeVideoContainer` | `string` | `auto / mp4 / webm / mkv` | `auto` |
| `disableMetadata` | `boolean` | Strip metadata from output | `false` |
| `alwaysProxy` | `boolean` | Always tunnel | `false` |
| `localProcessing` | `string` | `disabled / preferred / forced` | `disabled` |

### Response Types

| `status` | Meaning | Keys |
|----------|---------|------|
| `tunnel` | Cobalt proxying/transcoding | `url`, `filename` |
| `redirect` | Direct external URL | `url`, `filename` |
| `picker` | Multiple items | `picker[]` (type, url, thumb), optional `audio`, `audioFilename` |
| `local-processing` | Client-side processing | `type`, `service`, `tunnel[]`, `output`, optional `audio` |
| `error` | Failure | `error.code`, optional `error.context` |

### Error Codes

- `api.error.fetch.empty` — empty URL
- `api.error.fetch.invalid` — invalid URL
- `api.error.fetch.rate-limited` — rate limited
- `api.error.fetch.blocked` — content blocked
- `api.error.fetch.unsupported` — unsupported service
- `api.error.fetch.invalid-format` — format not available

### Authentication

- `Authorization: Api-Key <key>` — API key auth
- `Authorization: Bearer <jwt>` — JWT auth (via turnstile challenge)
- Optional: `API_AUTH_REQUIRED=1` forces auth for all requests

### Rate Limiting

- `RATELIMIT_WINDOW` (default 60s), `RATELIMIT_MAX` (default 20)
- Returns `RateLimit-*` headers per draft-polli-ratelimit-headers-02

### Supported Services (relevant subset)

| Service | URL patterns |
|---------|-------------|
| YouTube | `watch?v=ID`, `youtu.be/ID`, `shorts/ID`, `embed/ID`, `music.youtube.com` |
| Instagram | `/p/ID`, `/reel/ID`, `/reels/ID`, `/tv/ID`, `/stories/user/ID` |
| TikTok | `/@user/video/ID`, `vt.tiktok.com/ID`, `vm.tiktok.com/ID` |
| Facebook | `/watch?v=ID`, `fb.watch/ID`, `/reel/ID`, `/share/type/ID` |
| Twitter/X | `/user/status/ID`, `x.com`, `vxtwitter.com`, `fixvx.com` |

### Response Handling

1. **tunnel/redirect**: Browser downloads from `response.url` directly
2. **picker**: Show each item; user picks one; download from item `url`
3. **local-processing**: Client must merge/remux using tunnel URLs (not used in our integration — we set `localProcessing: "disabled"`)

---

## Docker Deployment

```yaml
services:
  cobalt:
    image: ghcr.io/imputnet/cobalt:latest
    restart: unless-stopped
    ports:
      - "9000:9000"
    environment:
      API_URL: "https://cobalt.yourdomain.com/"
      API_PORT: 9000
      CORS_WILDCARD: 0
      CORS_URL: "https://omnitily.vercel.app"
      DURATION_LIMIT: 10800
      RATELIMIT_WINDOW: 60
      RATELIMIT_MAX: 20
      TUNNEL_LIFESPAN: 90
```

### Requirements
- Node.js >= 18.17 (for non-Docker)
- ffmpeg (bundled in Docker image via ffmpeg-static)
- ~256MB RAM minimum, 512MB recommended
- CPU: handles ~10-20 concurrent streams depending on instance size

### Environment Variables (key ones)

| Variable | Purpose |
|----------|---------|
| `API_URL` | **Required.** Public URL of the instance |
| `API_PORT` | Listen port (default 9000) |
| `CORS_WILDCARD` | 0 = restricted, 1 = open |
| `CORS_URL` | Allowed origin when wildcard=0 |
| `DURATION_LIMIT` | Max video duration in seconds (default 10800 = 3h) |
| `RATELIMIT_WINDOW` | Rate limit window seconds |
| `RATELIMIT_MAX` | Max requests per window |
| `TUNNEL_LIFESPAN` | Tunnel cache duration seconds |
| `API_KEY_URL` | Path/URL to keys.json |
| `API_AUTH_REQUIRED` | 1 = require auth |

---

## AGPL-3.0 Obligations

Cobalt API is licensed under AGPL-3.0. Key obligations:

1. **If we modify the Cobalt source code** and run it as a network service, we must offer the Corresponding Source to users of that service.
2. **If we use Cobalt unmodified** as a separate service (our architecture), AGPL obligations apply to the Cobalt instance, not to Omnitily.
3. **We do NOT copy Cobalt code into Omnitily.** We call the Cobalt API over HTTP — this is a standard API client relationship.
4. **Attribution:** We preserve copyright notices and license references for the Cobalt dependency.

### Our architecture avoids AGPL contamination:
- Omnitily frontend → Omnitily API → Cobalt API (separate service)
- No Cobalt code is embedded in Omnitily
- No Cobalt frontend is copied
- The Cobalt instance runs independently

---

## Privacy & Security

- Cobalt never caches content — works as a "fancy proxy"
- End user is responsible for what they download
- Cobalt supports rate limiting, turnstile, and API key auth
- Tunnel URLs are ephemeral (TUNNEL_LIFESPAN)
- No persistent storage of user URLs or downloads

---

## What We Use

| Feature | Value |
|---------|-------|
| Auth method | API-Key (server-side only) |
| Response types handled | tunnel, redirect, picker |
| localProcessing | `disabled` (server handles all) |
| Duration limit | 10800s (3h) |
| Rate limit | Handled by Cobalt instance |
