import ytdl from "@distube/ytdl-core";

export default async (req: any, res: any) => {
  // Use Rick Astley - universally available, no restrictions
  const videoId = 'dQw4w9WgXcQ';
  const results: any = { videoId, note: 'Testing with Rick Astley (universally available)' };

  const tryClient = async (label: string, clientName: string, clientVersion: string, clientNameInt: string, apiKey: string, extraClient: any = {}, extraContext: any = {}, extraHeaders: any = {}) => {
    try {
      const r = await fetch(`https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-YouTube-Client-Name': clientNameInt,
          'X-YouTube-Client-Version': clientVersion,
          'Origin': 'https://www.youtube.com',
          ...extraHeaders,
        },
        body: JSON.stringify({
          context: { client: { hl: 'en', gl: 'US', clientName, clientVersion, ...extraClient }, ...extraContext },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
        signal: AbortSignal.timeout(8000),
      });
      const data: any = await r.json();
      const formats = data?.streamingData?.formats || [];
      const mp4 = formats.find((f: any) => f.mimeType?.includes('video/mp4'));
      results[label] = {
        status: r.status,
        playabilityStatus: data?.playabilityStatus?.status,
        reason: data?.playabilityStatus?.reason?.slice(0, 80),
        formatsCount: formats.length,
        hasUrl: !!mp4?.url,
        hasCipher: !!mp4?.signatureCipher,
        sampleUrl: (mp4?.url || mp4?.signatureCipher)?.slice(0, 100) || null,
      };
    } catch (e: any) {
      results[label] = { error: e.message };
    }
  };

  await Promise.all([
    tryClient('android_testsuite', 'ANDROID_TESTSUITE', '1.9', '30',
      'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
      { androidSdkVersion: 30 }, {},
      { 'User-Agent': 'com.google.android.youtube/1.9 (Linux; U; Android 10) gzip' }
    ),
    tryClient('android', 'ANDROID', '19.29.37', '3',
      'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
      { androidSdkVersion: 34, osName: 'Android', osVersion: '14', platform: 'MOBILE' }, {},
      { 'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 14; SM-G998B) gzip' }
    ),
    tryClient('web_embedded_google', 'WEB_EMBEDDED_PLAYER', '2.20231219.01.00', '56',
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {}, { thirdParty: { embedUrl: 'https://www.google.com/' } },
      { 'Referer': 'https://www.google.com/' }
    ),
    tryClient('web_embedded_ytbe', 'WEB_EMBEDDED_PLAYER', '2.20231219.01.00', '56',
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {}, { thirdParty: { embedUrl: 'https://youtu.be/' } },
      { 'Referer': 'https://youtu.be/' }
    ),
    tryClient('web_creator', 'WEB_CREATOR', '1.20231219.00.00', '62',
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {}, {},
      { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    ),
  ]);

  // Also test ytdl with YOUTUBE_COOKIE if set
  const cookie = process.env.YOUTUBE_COOKIE;
  results.cookie_set = !!cookie;
  if (cookie) {
    try {
      const info = await ytdl.getInfo(`https://youtu.be/${videoId}`, {
        requestOptions: { headers: { cookie } }
      });
      results.ytdl_with_cookie = {
        ok: true,
        title: info.videoDetails.title,
        formatsCount: info.formats.length,
      };
    } catch (e: any) {
      results.ytdl_with_cookie = { error: e.message };
    }
  }

  res.json(results);
};
