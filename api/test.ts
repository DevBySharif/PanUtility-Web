import https from 'https';

function httpsGetJson(urlStr: string, redirectsCount = 0): Promise<any> {
  if (redirectsCount > 5) {
    return Promise.reject(new Error('Too many redirects'));
  }
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 5000
    };

    const req = https.request(options, (res) => {
      if (res.statusCode && (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308)) {
        const location = res.headers.location;
        if (location) {
          const redirectUrl = location.startsWith('http') ? location : new URL(location, urlStr).toString();
          resolve(httpsGetJson(redirectUrl, redirectsCount + 1));
          return;
        }
      }

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
  const results: any = { videoId };

  try {
    console.log('Fetching public Invidious instances list...');
    // We fetch instances list directly from Vercel where api.invidious.io resolves
    const list = await httpsGetJson('https://api.invidious.io/instances.json');
    
    const activeInstances: string[] = [];
    for (const [name, info] of list) {
      if (info.type === 'https' && info.monitor && info.monitor.status === 1) {
        activeInstances.push(`https://${name}`);
      }
    }
    
    results.total_active_instances = activeInstances.length;
    results.first_10_instances = activeInstances.slice(0, 10);

    // Let's test the first 10 instances in parallel to find a working one
    const testPromises = activeInstances.slice(0, 10).map(async (base) => {
      try {
        const url = `${base}/api/v1/videos/${videoId}?fields=title,formatStreams`;
        const data = await httpsGetJson(url);
        const mp4 = (data.formatStreams || []).find((f: any) => f.container === 'mp4');
        return {
          instance: base,
          ok: true,
          title: data.title,
          mp4Url: mp4?.url ? mp4.url.slice(0, 100) : null
        };
      } catch (e: any) {
        return {
          instance: base,
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
