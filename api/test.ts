import https from 'https';

function httpsGetJson(urlStr: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP status ${res.statusCode}: ${data.slice(0, 100)}`));
          }
        } catch (e: any) {
          reject(new Error(`JSON parse error: ${e.message} (Data: ${data.slice(0, 100)})`));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

export default async (req: any, res: any) => {
  const videoId = 'G6OCJa1jBdY'; // User's music video
  const results: any = {};

  const instances = [
    'https://api.piped.yt',
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
      const data = await httpsGetJson(url);
      const mp4 = (data.videoStreams || []).find((s: any) => s.mimeType?.includes('video/mp4') && !s.videoOnly);
      results[base] = {
        ok: true,
        title: data.title,
        mp4Url: mp4?.url ? mp4.url.slice(0, 100) : null
      };
    } catch (e: any) {
      results[base] = { ok: false, error: e.message };
    }
  }));

  res.json(results);
};
