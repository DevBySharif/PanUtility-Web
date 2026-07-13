export default async (req: any, res: any) => {
  const videoId = 'G6OCJa1jBdY';
  const results: any = {};

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
  };

  // Test multiple Invidious instances
  const invidiousInstances = [
    'https://invidious.privacydev.net',
    'https://yewtu.be',
    'https://iv.ggtyler.dev',
    'https://invidious.flokinet.to',
    'https://yt.cdaut.de',
    'https://invidious.nerdvpn.de',
  ];

  results.invidious = {};
  await Promise.all(invidiousInstances.map(async (base) => {
    try {
      const r = await fetch(`${base}/api/v1/videos/${videoId}?fields=title,formatStreams`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const data: any = await r.json();
        const mp4 = (data.formatStreams || []).find((f: any) => f.container === 'mp4');
        results.invidious[base] = {
          ok: true,
          title: data.title,
          mp4Quality: mp4?.quality,
          mp4UrlPreview: mp4?.url?.slice(0, 80),
        };
      } else {
        const body = await r.text();
        results.invidious[base] = { ok: false, status: r.status, body: body.slice(0, 100) };
      }
    } catch (e: any) {
      results.invidious[base] = { ok: false, error: e.message };
    }
  }));

  // Test y2mate API
  try {
    const r = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ k_query: `https://youtube.com/watch?v=${videoId}`, k_page: 'home', hl: 'en', q_auto: '0' }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    results.y2mate = { status: r.status, title: data?.title, hasLinks: !!data?.links };
  } catch (e: any) {
    results.y2mate = { error: e.message };
  }

  // Test yt5s API
  try {
    const r = await fetch('https://yt5s.io/api/ajaxSearch', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ q: `https://youtube.com/watch?v=${videoId}`, vt: 'home' }),
      signal: AbortSignal.timeout(8000),
    });
    const text = await r.text();
    results.yt5s = { status: r.status, preview: text.slice(0, 300) };
  } catch (e: any) {
    results.yt5s = { error: e.message };
  }

  // Test cobalt API (public instance)
  try {
    const r = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ url: `https://youtube.com/watch?v=${videoId}`, videoQuality: '720' }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    results.cobalt = { status: r.status, type: data?.status, urlPreview: data?.url?.slice(0, 80) };
  } catch (e: any) {
    results.cobalt = { error: e.message };
  }

  res.json(results);
};
