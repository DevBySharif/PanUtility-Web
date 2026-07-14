import ytdl from "@distube/ytdl-core";

export default async (req: any, res: any) => {
  const videoId = 'dQw4w9WgXcQ';
  const cookie = process.env.YOUTUBE_COOKIE;
  const results: any = { videoId, cookie_set: !!cookie };

  let agent: any = undefined;
  if (cookie) {
    const parts = cookie.split(';').map(p => p.trim());
    const cookies = parts.map(part => {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) return null;
      const name = part.substring(0, eqIdx).trim();
      const value = part.substring(eqIdx + 1).trim();
      return { name, value, domain: '.youtube.com', path: '/' };
    }).filter((c): c is any => c !== null);
    
    try {
      agent = ytdl.createAgent(cookies);
    } catch (e: any) {
      results.agent_error = e.message;
    }
  }

  try {
    console.log("Calling ytdl.getBasicInfo...");
    const info = await ytdl.getBasicInfo(`https://youtu.be/${videoId}`, { agent });
    results.basic_info = {
      ok: true,
      title: info.videoDetails?.title,
      playabilityStatus: info.playabilityStatus?.status,
      formatsCount: info.formats?.length || 0,
      hasStreamingData: !!info.streamingData,
      rawFormats: (info.formats || []).map((f: any) => ({
        itag: f.itag,
        mimeType: f.mimeType,
        hasUrl: !!f.url,
        hasCipher: !!f.signatureCipher
      }))
    };
  } catch (e: any) {
    results.basic_info = { ok: false, error: e.message, stack: e.stack?.slice(0, 500) };
  }

  res.json(results);
};
