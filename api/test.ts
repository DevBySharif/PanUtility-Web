export default async (req: any, res: any) => {
  const videoId = 'dQw4w9WgXcQ';
  const cookie = process.env.YOUTUBE_COOKIE;
  const results: any = { videoId, cookie_set: !!cookie };

  let cleanCookie = cookie ? cookie.trim() : '';
  if (cleanCookie.startsWith('"') && cleanCookie.endsWith('"')) {
    cleanCookie = cleanCookie.slice(1, -1).trim();
  }
  if (cleanCookie.startsWith("'") && cleanCookie.endsWith("'")) {
    cleanCookie = cleanCookie.slice(1, -1).trim();
  }

  const tryInnerTube = async (label: string, clientName: string, clientVersion: string, clientNameInt: string, apiKey: string, extraBody: any = {}, extraHeaders: any = {}) => {
    try {
      const url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`;
      
      const headers: any = {
        'Content-Type': 'application/json',
        'X-YouTube-Client-Name': clientNameInt,
        'X-YouTube-Client-Version': clientVersion,
        'Origin': 'https://www.youtube.com',
        ...extraHeaders,
      };
      
      if (cleanCookie) {
        headers['Cookie'] = cleanCookie;
      }

      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          context: {
            client: {
              hl: 'en',
              gl: 'US',
              clientName,
              clientVersion,
              ...extraBody.clientExtra,
            },
            ...extraBody.contextExtra,
          },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
          ...extraBody.bodyExtra,
        }),
        signal: AbortSignal.timeout(8000),
      });

      const data: any = await r.json();
      const formats = data?.streamingData?.formats || [];
      const adaptive = data?.streamingData?.adaptiveFormats || [];
      const mp4 = [...formats, ...adaptive].find((f: any) => f.mimeType?.includes('video/mp4'));

      results[label] = {
        ok: r.status === 200,
        status: r.status,
        playabilityStatus: data?.playabilityStatus?.status,
        reason: data?.playabilityStatus?.reason?.slice(0, 80),
        formatsCount: formats.length + adaptive.length,
        hasCipher: !!mp4?.signatureCipher,
        sampleUrl: (mp4?.url || mp4?.signatureCipher)?.slice(0, 100) || null,
      };
    } catch (e: any) {
      results[label] = { error: e.message };
    }
  };

  await Promise.all([
    // Test iOS client with cookie
    tryInnerTube('ios', 'IOS', '19.29.1', '5',
      'AIzaSyB-63vPrdThhKuerbB2N_l7kwpS9-4bpQ',
      { clientExtra: { deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '17.5.1.21F90', platform: 'MOBILE' } },
      { 'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iPhone OS 17_5_1 like Mac OS X)' }
    ),

    // Test ANDROID client with cookie
    tryInnerTube('android', 'ANDROID', '19.29.37', '3',
      'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
      { clientExtra: { androidSdkVersion: 34, osName: 'Android', osVersion: '14', platform: 'MOBILE' } },
      { 'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 14; SM-G998B) gzip' }
    ),

    // Test WEB_CREATOR client with cookie
    tryInnerTube('web_creator', 'WEB_CREATOR', '1.20231219.00.00', '62',
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {}, {},
      { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
    ),

    // Test MWEB client with cookie
    tryInnerTube('mweb', 'MWEB', '2.20231219.04.00', '2',
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {}, {},
      { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15' }
    ),
  ]);

  res.json(results);
};
