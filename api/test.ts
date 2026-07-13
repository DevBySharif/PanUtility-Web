export default async (req: any, res: any) => {
  const videoId = 'G6OCJa1jBdY';
  const results: any = {};

  // Test 1: YouTube oEmbed (metadata only - always works)
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=https://youtu.be/${videoId}&format=json`);
    const data: any = await r.json();
    results.oembed = { ok: r.ok, title: data.title, thumb: data.thumbnail_url };
  } catch (e: any) {
    results.oembed = { error: e.message };
  }

  // Test 2: InnerTube ANDROID client (YouTube's own mobile API)
  try {
    const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 14; SM-G998B Build/UP1A) gzip',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.29.37',
        'X-YouTube-Utc-Offset': '0',
        'X-YouTube-Time-Zone': 'UTC',
        'Origin': 'https://www.youtube.com',
      },
      body: JSON.stringify({
        context: {
          client: {
            hl: 'en', gl: 'US',
            clientName: 'ANDROID',
            clientVersion: '19.29.37',
            androidSdkVersion: 34,
            osName: 'Android',
            osVersion: '14',
            platform: 'MOBILE',
          }
        },
        videoId,
        params: 'CgIQBg=='
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    const formats = data?.streamingData?.formats || [];
    const adaptive = data?.streamingData?.adaptiveFormats || [];
    const mp4 = formats.find((f: any) => f.mimeType?.includes('video/mp4'));
    results.innertube_android = {
      ok: r.status === 200,
      status: r.status,
      playabilityStatus: data?.playabilityStatus?.status,
      reason: data?.playabilityStatus?.reason,
      formatsCount: formats.length + adaptive.length,
      sampleUrl: mp4?.url?.slice(0, 100) || null,
      hasCipher: !!mp4?.signatureCipher,
    };
  } catch (e: any) {
    results.innertube_android = { error: e.message };
  }

  // Test 3: InnerTube TV_EMBEDDED client
  try {
    const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1',
        'X-YouTube-Client-Name': '85',
        'X-YouTube-Client-Version': '2.0',
        'Origin': 'https://www.youtube.com',
        'Referer': `https://www.youtube.com/embed/${videoId}`,
      },
      body: JSON.stringify({
        context: {
          client: {
            hl: 'en', gl: 'US',
            clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
            clientVersion: '2.0',
          },
          thirdParty: { embedUrl: 'https://www.youtube.com/' }
        },
        videoId,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    const formats = data?.streamingData?.formats || [];
    const mp4 = formats.find((f: any) => f.mimeType?.includes('video/mp4'));
    results.innertube_tv = {
      ok: r.status === 200,
      playabilityStatus: data?.playabilityStatus?.status,
      reason: data?.playabilityStatus?.reason,
      formatsCount: formats.length,
      sampleUrl: mp4?.url?.slice(0, 100) || null,
      hasCipher: !!mp4?.signatureCipher,
    };
  } catch (e: any) {
    results.innertube_tv = { error: e.message };
  }

  // Test 4: Piped API (alternative YouTube frontend)
  const pipedInstances = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.adminforge.de',
    'https://pipedapi.in.projectsegfau.lt',
  ];
  results.piped = {};
  await Promise.all(pipedInstances.map(async (base) => {
    try {
      const r = await fetch(`${base}/streams/${videoId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) {
        const data: any = await r.json();
        const mp4 = (data.videoStreams || []).find((s: any) => s.mimeType?.includes('video/mp4') && !s.videoOnly);
        results.piped[base] = { ok: true, title: data.title, sampleUrl: mp4?.url?.slice(0, 100) };
      } else {
        results.piped[base] = { ok: false, status: r.status };
      }
    } catch (e: any) {
      results.piped[base] = { error: e.message };
    }
  }));

  res.json(results);
};
