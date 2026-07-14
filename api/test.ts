export default async (req: any, res: any) => {
  const videoId = 'G6OCJa1jBdY'; // User's music video
  const results: any = {};

  const instances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.privacydev.net',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.lunar.icu',
    'https://pipedapi.hostux.net',
    'https://pipedapi.mha.fi'
  ];

  await Promise.all(instances.map(async (base) => {
    try {
      const url = `${base}/streams/${videoId}`;
      const r = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) {
        const data: any = await r.json();
        const mp4 = (data.videoStreams || []).find((s: any) => s.mimeType?.includes('video/mp4') && !s.videoOnly);
        results[base] = {
          ok: true,
          title: data.title,
          mp4Url: mp4?.url ? mp4.url.slice(0, 100) : null
        };
      } else {
        results[base] = { ok: false, status: r.status };
      }
    } catch (e: any) {
      results[base] = { ok: false, error: e.message };
    }
  }));

  res.json(results);
};
