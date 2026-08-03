# API error contract

Every API failure returns JSON in this form:

```json
{"error":{"code":"RATE_LIMITED","message":"Too many requests. Try again later.","requestId":"..."}}
```

Codes are stable: `BAD_REQUEST` (400), `INVALID_ORIGIN` (403), `METHOD_NOT_ALLOWED` (405), `UNSUPPORTED_MEDIA_TYPE` (415), `PAYLOAD_TOO_LARGE` (413), `RATE_LIMITED` (429), `FEATURE_DISABLED` (410), `PROVIDER_ERROR` (502), `SERVICE_UNAVAILABLE` (503), `PROVIDER_TIMEOUT` (504), and `NOT_FOUND` (404). Rate-limit responses include `Retry-After`.

Client responses never contain stacks, upstream bodies, DNS/IP diagnostics, filesystem paths, credentials, API keys, cookies, audio data, or provider internals. `X-Request-ID` and the response `requestId` support correlation with redacted structured server logs.

