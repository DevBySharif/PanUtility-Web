async function resolveYouTubeCobalt(urlStr: string): Promise<any> {
  const instances = [
    'https://cobaltapi.cjs.nz',
    'https://rue-cobalt.xenon.zone'
  ];
  
  for (const api of instances) {
    try {
      console.log(`Trying Cobalt instance: ${api}`);
      const r = await fetch(api, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        },
        body: JSON.stringify({
          url: urlStr,
          videoQuality: '720'
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (r.ok) {
        const data: any = await r.json();
        if (data.url) {
          return {
            instance: api,
            title: data.filename || 'YouTube Video',
            videoUrl: data.url,
          };
        }
      }
    } catch (e: any) {
      console.warn(`Cobalt instance ${api} failed:`, e.message);
    }
  }
  throw new Error('All Cobalt instances failed to resolve YouTube stream.');
}

export default async (req: any, res: any) => {
  const videoId1 = 'dQw4w9WgXcQ'; // Rick Astley
  const videoId2 = 'G6OCJa1jBdY'; // User's video

  const results: any = {};

  try {
    const r1 = await resolveYouTubeCobalt(`https://youtu.be/${videoId1}`);
    results.rick_astley = { ok: true, ...r1 };
  } catch (e: any) {
    results.rick_astley = { ok: false, error: e.message };
  }

  try {
    const r2 = await resolveYouTubeCobalt(`https://youtu.be/${videoId2}`);
    results.user_video = { ok: true, ...r2 };
  } catch (e: any) {
    results.user_video = { ok: false, error: e.message };
  }

  res.json(results);
};
