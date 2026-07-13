export default async (req: any, res: any) => {
  const videoId = 'G6OCJa1jBdY';
  const results: any = {};

  const tryInnerTube = async (label: string, clientName: string, clientVersion: string, clientNameInt: string, apiKey: string, extraBody: any = {}, extraHeaders: any = {}) => {
    try {
      const url = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}&prettyPrint=false`;
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-YouTube-Client-Name': clientNameInt,
          'X-YouTube-Client-Version': clientVersion,
          'Origin': 'https://www.youtube.com',
          ...extraHeaders,
        },
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
      const mp4 = formats.find((f: any) => f.mimeType?.includes('video/mp4'));
      results[label] = {
        ok: r.status === 200,
        status: r.status,
        playabilityStatus: data?.playabilityStatus?.status,
        reason: data?.playabilityStatus?.reason?.slice(0, 80),
        formatsCount: formats.length,
        hasCipher: !!mp4?.signatureCipher,
        sampleUrl: mp4?.url?.slice(0, 100) || null,
      };
    } catch (e: any) {
      results[label] = { error: e.message };
    }
  };

  // Run all InnerTube client attempts in parallel
  await Promise.all([
    // ANDROID client with correct key
    tryInnerTube('android', 'ANDROID', '19.29.37', '3',
      'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
      { clientExtra: { androidSdkVersion: 34, osName: 'Android', osVersion: '14', platform: 'MOBILE' } },
      { 'User-Agent': 'com.google.android.youtube/19.29.37 (Linux; U; Android 14; SM-G998B) gzip' }
    ),

    // ANDROID_TESTSUITE - internal testing client, often less restricted
    tryInnerTube('android_testsuite', 'ANDROID_TESTSUITE', '1.9', '30',
      'AIzaSyA8eiZmM1FaDVjRy-df2KTyQ_vz_yYM39w',
      { clientExtra: { androidSdkVersion: 30 } },
      { 'User-Agent': 'com.google.android.youtube/1.9 (Linux; U; Android 10) gzip' }
    ),

    // iOS client
    tryInnerTube('ios', 'IOS', '19.29.1', '5',
      'AIzaSyB-63vPrdThhKuerbB2N_l7kwpS9-4bpQ',
      { clientExtra: { deviceModel: 'iPhone16,2', osName: 'iPhone', osVersion: '17.5.1.21F90', platform: 'MOBILE' } },
      { 'User-Agent': 'com.google.ios.youtube/19.29.1 (iPhone16,2; U; CPU iPhone OS 17_5_1 like Mac OS X)' }
    ),

    // ANDROID_VR (Oculus)
    tryInnerTube('android_vr', 'ANDROID_VR', '1.61.48', '28',
      'AIzaSyDCU8hByM-4DrUqRUYnGn-3llEO78bcxq8',
      { clientExtra: { deviceModel: 'Quest 3', androidSdkVersion: 32, osName: 'Android', osVersion: '12' } },
      { 'User-Agent': 'com.google.android.apps.youtube.vr.oculus/1.61.48 (Linux; U; Android 12; Quest 3 Build/SQ3A) gzip' }
    ),

    // MWEB - mobile browser, less bot-check
    tryInnerTube('mweb', 'MWEB', '2.20231219.04.00', '2',
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {},
      { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15' }
    ),

    // WEB_EMBEDDED - for embedded players on 3rd party sites
    tryInnerTube('web_embedded', 'WEB_EMBEDDED_PLAYER', '2.20231219.01.00', '56',
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      {
        contextExtra: { thirdParty: { embedUrl: 'https://www.google.com/' } },
      },
      { 'Referer': 'https://www.google.com/' }
    ),
  ]);

  res.json(results);
};
