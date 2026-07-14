import https from 'https';

function httpsPostJson(urlStr: string, bodyObj: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const bodyData = JSON.stringify(bodyObj);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyData)
      },
      timeout: 6000
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
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(bodyData);
    req.end();
  });
}

export default async (req: any, res: any) => {
  const videoId = 'G6OCJa1jBdY'; // User's music video
  const results: any = { videoId };

  const instances = [
    'https://subito-c.meowing.de',
    'https://nuko-c.meowing.de',
    'https://lime.clxxped.lol',
    'https://grapefruit.clxxped.lol',
    'https://cherry.clxxped.lol',
    'https://cobaltapi.squair.xyz',
    'https://api.cobalt.liubquanti.click',
    'https://api.qwkuns.me',
    'https://api-cobalt.eversiege.network',
    'https://cobaltapi.kittycat.boo',
    'https://dog.kittycat.boo',
    'https://rue-cobalt.xenon.zone',
    'https://cobaltapi.cjs.nz',
    'https://api.canine.tools',
    'https://cobaltapi.canine.tools'
  ];

  results.total_apis = instances.length;

  const testPromises = instances.map(async (api) => {
    try {
      const data = await httpsPostJson(api, {
        url: `https://www.youtube.com/watch?v=${videoId}`,
        videoQuality: '720'
      });
      return {
        api,
        ok: true,
        urlPreview: data.url ? data.url.slice(0, 100) : null
      };
    } catch (e: any) {
      return {
        api,
        ok: false,
        error: e.message
      };
    }
  });

  results.test_results = await Promise.all(testPromises);

  res.json(results);
};
