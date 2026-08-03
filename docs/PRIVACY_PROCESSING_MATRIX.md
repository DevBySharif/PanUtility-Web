# Privacy and processing matrix

The registry renders these labels consistently:

| Type | User-facing meaning | Tools |
|---|---|---|
| Browser | Processed locally in your browser. | All enabled tools except the three entries below |
| Server | Data is sent to PanUtility's server. | `audio-transcriber` (the server forwards audio to Google Gemini; explicit unchecked confirmation is required) |
| External | Data or URLs are sent to a third-party provider. | `qr-generator` (QR contents to QR rendering provider) |
| None | No processing is available. | All `coming-soon` and `disabled` entries |

`social-downloader` is disabled and sends nothing. Provider availability affects Gemini/QR results. These labels are disclosures, not claims about retention, security, or provider guarantees.

Production transcription accepts at most 3 MiB of decoded audio, requires explicit consent, and uses a privacy-safe hashed rate-limit identity. Raw client IPs and audio payloads are not placed in rate-limit keys or logs.
