# Provider policy

## Retained

- Google Gemini: retained only for user-confirmed audio transcription. Audio is uploaded to PanUtility and forwarded to Gemini. Requests are validated, limited, rate-controlled, single-attempt, and timed out. Availability and provider handling remain external dependencies; no unverified retention promise is made.
- QRServer: unchanged browser-side external QR renderer. It is outside the server API and remains explicitly disclosed in the registry/UI.

## Removed

- SaveFrom, SnapSave, community Cobalt instances, YouTube player-script downloads, and `@distube/ytdl-core` were removed from production API behavior.
- `YOUTUBE_COOKIE` was removed because no retained server implementation needs it. Any previously used cookie should be revoked/rotated.

Social downloading is disabled. Re-enabling requires a documented, legally reviewed provider with a stable data API, schema-validated responses, permitted media hosts/types, short-lived signed proxy tokens, global quotas, deterministic mocked tests, and no remote code execution or scraping fallback.

