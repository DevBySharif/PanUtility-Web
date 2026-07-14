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
    req.write(bodyData);
    req.end();
  });
}

export default async (req: any, res: any) => {
  const videoId = 'G6OCJa1jBdY'; // User's music video
  const results: any = {};

  try {
    const data = await httpsPostJson('https://co.wuk.sh/', {
      url: `https://www.youtube.com/watch?v=${videoId}`,
      videoQuality: '720'
    });
    results.wuk = { ok: true, data };
  } catch (e: any) {
    results.wuk = { ok: false, error: e.message };
  }

  res.json(results);
};
