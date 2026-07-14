import ytdl from "@distube/ytdl-core";
import vm from "vm";

async function resolveYouTubeHybrid(urlStr: string, cookie?: string): Promise<any> {
  const cookieHeaders = cookie ? { cookie } : {};
  const info = await ytdl.getInfo(urlStr, {
    requestOptions: {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        ...cookieHeaders,
      }
    }
  });

  const title = info.videoDetails.title || "";
  const thumbnail = info.videoDetails.thumbnails?.[0]?.url || "";
  const seconds = parseInt(info.videoDetails.lengthSeconds || "0", 10);
  const duration = seconds ? new Date(seconds * 1000).toISOString().substring(11, 19).replace(/^00:/, '') : "00:00";

  // Fetch player JS
  const playerUrl = info.html5player.startsWith('http') ? info.html5player : 'https://www.youtube.com' + info.html5player;
  const jsResp = await fetch(playerUrl, { headers: { 'User-Agent': 'Mozilla/5.0', ...cookieHeaders } });
  const body = await jsResp.text();

  // Parse decipher functions
  const mainPattern = /\b([a-zA-Z0-9_$]+)\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*([a-zA-Z0-9_$]+)\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*[a-zA-Z0-9$.]+\s*\)\s*\)/;
  const mainMatch = body.match(mainPattern);
  if (!mainMatch) {
    throw new Error('Could not find main decipher pattern in player script.');
  }
  const vdName = mainMatch[1];
  const vdArg1 = parseInt(mainMatch[2], 10);
  const vdArg2 = parseInt(mainMatch[3], 10);
  const sfName = mainMatch[4];
  const sfArg1 = parseInt(mainMatch[5], 10);
  const sfArg2 = parseInt(mainMatch[6], 10);

  const hrPattern = new RegExp(`\\b([a-zA-Z0-9_$]+)\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*[a-zA-Z0-9_$]+\\s*\\)`);
  const hrMatch = body.match(hrPattern);
  if (!hrMatch) {
    throw new Error('Could not find HR call pattern in player script.');
  }
  const hrName = hrMatch[1];
  const hrArg1 = parseInt(hrMatch[2], 10);
  const hrArg2 = parseInt(hrMatch[3], 10);

  // Parse n transform args
  const allMatches = [...body.matchAll(new RegExp(`\\b${sfName}\\s*\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*[a-zA-Z0-9$_]+\\s*\\)`, 'g'))];
  let nArg1 = null, nArg2 = null;
  allMatches.forEach(m => {
    const a1 = parseInt(m[1], 10);
    const a2 = parseInt(m[2], 10);
    const cond1 = (a1 >> 2 & 15) === 1;
    const cond2 = ((a1 - 9) & 7) >= 3 && (a1 ^ 55) < 11;
    if (cond1 || cond2) {
      nArg1 = a1;
      nArg2 = a2;
    }
  });

  if (nArg1 === null) {
    nArg1 = 48;
    nArg2 = 3768;
  }

  const gClassPattern = /new\s+g\.([a-zA-Z0-9$_]+)\(\s*[a-zA-Z0-9$_]+\s*,\s*!0\s*\)/;
  const gClassMatch = body.match(gClassPattern);
  if (!gClassMatch) {
    throw new Error('Could not find parsed URL class name (g.className) in player script.');
  }
  const gClassName = gClassMatch[1];

  const sandbox: any = {
    self: {}, window: {},
    document: {
      createElement: () => ({ appendChild: () => {}, style: {}, addEventListener: () => {} }),
      querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener: () => {},
      currentScript: { src: playerUrl }
    },
    navigator: { userAgent: 'Mozilla/5.0', languages: ['en-US'] },
    location: { href: 'https://www.youtube.com/', hostname: 'www.youtube.com' },
    screen: { width: 1920, height: 1080 }, history: {},
    XMLHttpRequest: Object.assign(function() {}, { prototype: { fetch: () => {} } }),
    setTimeout: () => {}, setInterval: () => {}, clearTimeout: () => {}, clearInterval: () => {},
    Math, Date, String, Number, Array, Object, RegExp, parseInt, parseFloat, decodeURIComponent, encodeURIComponent
  };
  sandbox.self = sandbox;
  sandbox.window = sandbox;

  vm.createContext(sandbox);
  const closureClosingToken = '})(_yt_player);';
  const exposureCode = `
;globalThis._decipher = (sig) => {
  const step1 = ${sfName}(${sfArg1}, ${sfArg2}, sig);
  const step2 = ${vdName}(${vdArg1}, ${vdArg2}, step1);
  return ${hrName}(${hrArg1}, ${hrArg2}, step2);
};
globalThis._deobfuscateN = (urlStr) => {
  const obj = new g.${gClassName}(urlStr, true);
  ${sfName}(${nArg1}, ${nArg2}, obj);
  return obj.get('n');
};
})(_yt_player);`;

  const scriptCode = body.replace(closureClosingToken, exposureCode);
  const script = new vm.Script(scriptCode);
  script.runInContext(sandbox, { timeout: 5000 });

  const resolvedFormats = [];
  for (const f of info.formats) {
    let finalUrl = f.url;
    if (f.signatureCipher) {
      const cipherData = Object.fromEntries(new URLSearchParams(f.signatureCipher));
      const s = decodeURIComponent(cipherData.s || '');
      const urlStr = decodeURIComponent(cipherData.url || '');
      const sp = cipherData.sp || 'sig';
      
      const decipheredSig = sandbox._decipher(s);
      const components = new URL(urlStr);
      components.searchParams.set(sp, decipheredSig);
      finalUrl = components.toString();
    }
    
    if (finalUrl) {
      const components = new URL(finalUrl);
      const rawN = components.searchParams.get('n');
      if (rawN) {
        const deobfuscatedN = sandbox._deobfuscateN(finalUrl);
        components.searchParams.set('n', deobfuscatedN);
        finalUrl = components.toString();
      }
      f.url = finalUrl;
      resolvedFormats.push(f);
    }
  }

  const mp4s = resolvedFormats.filter(f => f.url && f.container === 'mp4' && f.hasVideo && f.hasAudio);
  const preferred = mp4s.find(f => f.qualityLabel === '360p' || f.qualityLabel === '720p') || mp4s[0] || resolvedFormats[0];
  
  if (!preferred?.url) {
    throw new Error('No playable format found after deciphering.');
  }

  return {
    title, thumbnail,
    videoUrl: preferred.url,
    duration,
    totalFormatsResolved: resolvedFormats.length
  };
}

export default async (req: any, res: any) => {
  const videoId = 'dQw4w9WgXcQ';
  const cookie = process.env.YOUTUBE_COOKIE;
  const results: any = { videoId, cookie_set: !!cookie };

  try {
    const hybridResult = await resolveYouTubeHybrid(`https://youtu.be/${videoId}`, cookie);
    results.hybrid_resolved = {
      ok: true,
      title: hybridResult.title,
      totalFormats: hybridResult.totalFormatsResolved,
      videoUrlPreview: hybridResult.videoUrl.slice(0, 150)
    };
  } catch (e: any) {
    results.hybrid_resolved = { ok: false, error: e.message, stack: e.stack?.slice(0, 500) };
  }

  res.json(results);
};
