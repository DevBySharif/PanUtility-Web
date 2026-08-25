import type { CobaltResponse, DownloadOptions, DownloadResult, Platform, SocialDownloadProvider } from './types.js';

const COBALT_TIMEOUT_MS = 30_000;

export class CobaltProvider implements SocialDownloadProvider {
  private apiUrl: string;
  private apiKey?: string;

  constructor(apiUrl: string, apiKey?: string) {
    this.apiUrl = apiUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.apiUrl);
  }

  async resolve(platform: Platform, url: string, options?: DownloadOptions): Promise<DownloadResult> {
    if (!this.isConfigured()) {
      return { status: 'error', errorCode: 'PROVIDER_NOT_CONFIGURED' };
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Api-Key ${this.apiKey}`;
    }

    const body = JSON.stringify({
      url,
      downloadMode: options?.downloadMode ?? 'auto',
      audioFormat: options?.audioFormat ?? 'mp3',
      videoQuality: options?.videoQuality ?? '1080',
      filenameStyle: 'basic',
      disableMetadata: false,
      alwaysProxy: false,
      localProcessing: 'disabled',
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), COBALT_TIMEOUT_MS);

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let errorCode = 'PROVIDER_HTTP_ERROR';
        try {
          const errBody = await response.json() as CobaltResponse;
          if (errBody.status === 'error') errorCode = errBody.error.code;
        } catch { /* ignore JSON parse errors on non-2xx responses */ }
        return { status: 'error', errorCode };
      }

      const data = await response.json() as CobaltResponse;
      return this.mapResponse(data);
    } catch (error: unknown) {
      clearTimeout(timeout);
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { status: 'error', errorCode: 'PROVIDER_TIMEOUT' };
      }
      return { status: 'error', errorCode: 'PROVIDER_ERROR' };
    }
  }

  private mapResponse(data: CobaltResponse): DownloadResult {
    switch (data.status) {
      case 'tunnel':
      case 'redirect':
        return {
          status: data.status,
          url: data.url,
          filename: data.filename,
        };
      case 'picker':
        return {
          status: 'picker',
          items: data.picker.map((item) => ({
            type: item.type,
            url: item.url,
            thumb: item.thumb,
          })),
          audioUrl: data.audio,
          audioFilename: data.audioFilename,
        };
      case 'error':
        return {
          status: 'error',
          errorCode: data.error.code,
        };
      default:
        return { status: 'error', errorCode: 'UNKNOWN_RESPONSE' };
    }
  }
}
