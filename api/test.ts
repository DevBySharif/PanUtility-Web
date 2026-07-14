async function resolveY2Mate(videoUrl: string): Promise<any> {
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://www.y2mate.com',
    'Referer': 'https://www.y2mate.com/',
    'X-Requested-With': 'XMLHttpRequest'
  };

  console.log('1. Analyzing video via Y2Mate...');
  const r1 = await fetch('https://www.y2mate.com/mates/en/analyzeV2/ajax', {
    method: 'POST',
    headers,
    body: new URLSearchParams({
      k_query: videoUrl,
      k_page: 'home',
      hl: 'en',
      q_auto: '0'
    }),
    signal: AbortSignal.timeout(6000)
  });

  if (!r1.ok) {
    throw new Error(`Y2Mate analyze failed with status ${r1.status}`);
  }

  const d1: any = await r1.json();
  if (d1.status !== 'ok') {
    throw new Error(`Y2Mate analyze returned error: ${d1.mess || 'unknown'}`);
  }

  const mp4Formats = d1.links?.mp4 || {};
  const itags = Object.keys(mp4Formats);
  
  if (itags.length === 0) {
    throw new Error('No MP4 formats found in Y2Mate response');
  }

  // Find 720p or 360p or first format
  const preferredItag = itags.find(k => mp4Formats[k].q === '720p') || itags.find(k => mp4Formats[k].q === '360p') || itags[0];
  const format = mp4Formats[preferredItag];

  console.log(`2. Converting format ${format.q}...`);
  const r2 = await fetch('https://www.y2mate.com/mates/en/convertV2/index', {
    method: 'POST',
    headers: {
      ...headers,
      'Referer': `https://www.y2mate.com/youtube/${d1.vid}`,
    },
    body: new URLSearchParams({
      vid: d1.vid,
      k: format.k
    }),
    signal: AbortSignal.timeout(6000)
  });

  if (!r2.ok) {
    throw new Error(`Y2Mate convert failed with status ${r2.status}`);
  }

  const d2: any = await r2.json();
  if (d2.status !== 'ok') {
    throw new Error(`Y2Mate convert returned error: ${d2.mess || 'unknown'}`);
  }

  return {
    title: d1.title,
    videoUrl: d2.dlink,
    quality: format.q
  };
}

export default async (req: any, res: any) => {
  const videoId = 'G6OCJa1jBdY'; // User's video
  const results: any = { videoId };

  try {
    const y2mateResult = await resolveY2Mate(`https://www.youtube.com/watch?v=${videoId}`);
    results.y2mate = { ok: true, ...y2mateResult };
  } catch (e: any) {
    results.y2mate = { ok: false, error: e.message };
  }

  res.json(results);
};
