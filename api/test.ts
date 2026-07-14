import ytdl from "@distube/ytdl-core";

export default async (req: any, res: any) => {
  const videoId = 'dQw4w9WgXcQ';
  const cookie = process.env.YOUTUBE_COOKIE;
  
  let cleanCookie = cookie ? cookie.trim() : '';
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
  };

  // Test 1: Direct Cookie header in requestOptions
  try {
    const info = await ytdl.getBasicInfo(`https://youtu.be/${videoId}`, {
      requestOptions: {
        headers: {
          'Cookie': cleanCookie,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        }
      }
    });
    results.direct_cookie = {
      ok: true,
      title: info.videoDetails?.title,
      formatsCount: info.formats?.length || 0,
      hasStreamingData: !!info.streamingData,
    };
  } catch (e: any) {
    results.direct_cookie = { ok: false, error: e.message };
  }

  // Test 2: ytdl.createAgent with multiple domains
  try {
    const parts = cleanCookie.split(';').map(p => p.trim());
    const cookies: any[] = [];
    parts.forEach(part => {
      const eqIdx = part.indexOf('=');
      if (eqIdx === -1) return;
      const name = part.substring(0, eqIdx).trim();
      const value = part.substring(eqIdx + 1).trim();
      // Add cookies for all possible domains to ensure match
      cookies.push({ name, value, domain: '.youtube.com', path: '/' });
      cookies.push({ name, value, domain: 'youtube.com', path: '/' });
      cookies.push({ name, value, domain: 'www.youtube.com', path: '/' });
    });
    
    const agent = ytdl.createAgent(cookies);
    const info = await ytdl.getBasicInfo(`https://youtu.be/${videoId}`, { agent });
    results.agent_cookie = {
      ok: true,
      title: info.videoDetails?.title,
      formatsCount: info.formats?.length || 0,
      hasStreamingData: !!info.streamingData,
    };
  } catch (e: any) {
    results.agent_cookie = { ok: false, error: e.message };
  }

  res.json(results);
};
