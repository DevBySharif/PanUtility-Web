import ytdl from "@distube/ytdl-core";

export default async (req: any, res: any) => {
  const videoId = 'dQw4w9WgXcQ';
  const cookie = process.env.YOUTUBE_COOKIE;
  
  let cleanCookie = cookie ? cookie.trim() : '';
  // Strip surrounding quotes if present
  if (cleanCookie.startsWith('"') && cleanCookie.endsWith('"')) {
    cleanCookie = cleanCookie.slice(1, -1).trim();
  }
  if (cleanCookie.startsWith("'") && cleanCookie.endsWith("'")) {
    cleanCookie = cleanCookie.slice(1, -1).trim();
  }

  const results: any = {
    videoId,
    cookie_set: !!cookie,
    cookie_length: cleanCookie.length,
    cookie_start: cleanCookie.slice(0, 20),
    cookie_end: cleanCookie.slice(-20),
  };

  let agent: any = undefined;
  if (cleanCookie) {
    const parts = cleanCookie.split(';').map(p => p.trim());
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
    const info = await ytdl.getBasicInfo(`https://youtu.be/${videoId}`, { agent });
    results.basic_info = {
      ok: true,
      title: info.videoDetails?.title,
      playabilityStatus: info.playabilityStatus?.status,
      formatsCount: info.formats?.length || 0,
      hasStreamingData: !!info.streamingData,
    };
  } catch (e: any) {
    results.basic_info = { ok: false, error: e.message };
  }

  res.json(results);
};
