import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AudioTranscriber, { TRANSCRIPTION_MAX_BYTES, validateTranscriptionFile } from '../src/components/AudioTranscriber';

vi.mock('../src/components/Toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const wav = (size = 44) => new File([new Uint8Array(size)], 'voice.wav', { type: 'audio/wav' });

describe('transcription frontend production contract', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ transcription: '[00:00] Hello' }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() });
  });
  it('validates empty, unsupported, oversized, and allowed files at the exact limit', () => {
    expect(validateTranscriptionFile(wav(0))).toMatch(/empty/i);
    expect(validateTranscriptionFile(new File(['x'], 'x.txt', { type: 'text/plain' }))).toMatch(/not supported/i);
    expect(validateTranscriptionFile(wav(TRANSCRIPTION_MAX_BYTES + 1))).toMatch(/3 MiB/i);
    expect(validateTranscriptionFile(wav(TRANSCRIPTION_MAX_BYTES))).toBeNull();
  });
  it('requires consent and blocks duplicate submissions', async () => {
    let resolveResponse!: (value: Response) => void;
    vi.mocked(fetch).mockImplementation(() => new Promise((resolve) => { resolveResponse = resolve; }));
    render(<AudioTranscriber onBack={vi.fn()} initialFile={wav()} />);
    const button = await screen.findByRole('button', { name: /transcribe with ai/i }); expect(button).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox')); await userEvent.click(button); await userEvent.click(button);
    expect(fetch).toHaveBeenCalledTimes(1); resolveResponse(new Response(JSON.stringify({ transcription: '[00:00] ok' }), { status: 200 }));
  });
  it.each([
    [429, 'RATE_LIMITED', /too many/i, { 'Retry-After': '30' }],
    [503, 'SERVICE_UNAVAILABLE', /temporarily unavailable/i, {}],
    [504, 'PROVIDER_TIMEOUT', /timed out/i, {}],
    [500, '', /could not complete/i, { 'Content-Type': 'text/html' }],
  ])('maps API status %s safely', async (status, code, expected, headers) => {
    vi.mocked(fetch).mockResolvedValue(new Response(code ? JSON.stringify({ error: { code } }) : '<html>', { status, headers }));
    render(<AudioTranscriber onBack={vi.fn()} initialFile={wav()} />);
    await userEvent.click(await screen.findByRole('checkbox')); await userEvent.click(screen.getByRole('button', { name: /transcribe with ai/i }));
    await waitFor(() => expect(screen.getByText(expected)).toBeVisible());
  });
  it('uses the recorder MIME and cleans up tracks', async () => {
    const stop = vi.fn(); const stream = { getTracks: () => [{ stop }] };
    class Recorder {
      static isTypeSupported = () => true; mimeType = 'audio/webm;codecs=opus'; ondataavailable?: (event: { data: Blob }) => void; onstop?: () => void;
      constructor() {} start() {} stop() { this.ondataavailable?.({ data: new Blob(['x'], { type: this.mimeType }) }); this.onstop?.(); }
    }
    vi.stubGlobal('MediaRecorder', Recorder); Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: vi.fn(async () => stream) } });
    render(<AudioTranscriber onBack={vi.fn()} />); await userEvent.click(screen.getByRole('button', { name: /start live record/i }));
    await userEvent.click(await screen.findByRole('button', { name: /stop & load recording/i })); await waitFor(() => expect(stop).toHaveBeenCalled());
    expect(screen.getByText(/Type: audio\/webm/i)).toBeVisible();
  });
});
