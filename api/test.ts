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
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });

    req.on('error', (err) => { reject(err); });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.end();
  });
}

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

  try {
    console.log('Fetching Cobalt instances list...');
    const list = await httpsGetJson('https://cobalt.directory/api/working?type=api');
    const apis: string[] = list.data?.youtube || [];
    
    // Add known instances in case they are missing from list
    const uniqueApis = Array.from(new Set([
      ...apis,
      'https://cobaltapi.cjs.nz',
      'https://rue-cobalt.xenon.zone'
    ]));

    results.total_apis = uniqueApis.length;

    // Test them in parallel
    const testPromises = uniqueApis.map(async (api) => {
      try {
        const data = await httpsPostJson(api, {
          url: `https://www.youtube.com/watch?v=${videoId}`,
          videoQuality: '720'
        });
        return {
          api,
          ok: true,
          status: 'success',
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

  } catch (e: any) {
    results.error = e.message;
  }

  res.json(results);
};
