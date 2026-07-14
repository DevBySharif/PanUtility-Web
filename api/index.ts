import express from "express";
import path from "path";
import dns from "dns";
import { promisify } from "util";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import vm from "vm";
import ytdl from "@distube/ytdl-core";

const dnsLookup = promisify(dns.lookup);

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please provide it in the Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function validateSafeUrl(urlStr: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlStr);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return false;
    }
    const hostname = parsedUrl.hostname.toLowerCase();
    
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname === "[::1]" ||
      hostname.endsWith(".local")
    ) {
      return false;
    }

    const lookupResult = await dnsLookup(hostname);
    const ip = lookupResult.address;

    if (
      ip.startsWith("127.") ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      ip.startsWith("169.254.") ||
      ip === "0.0.0.0"
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Helper to generate SaveFrom signature
function getSaveFromHash(url: string, ts: number): string {
  const salt = "b7944d7a59c9cb654228624880e7de59a53842c2d912b449fdf11febcf81cb21";
  return crypto.createHash("sha256").update(url + ts + salt).digest("hex");
}

// Self-contained SaveFrom API scraper
async function resolveSaveFrom(url: string): Promise<any> {
  const ts = Date.now();
  const form = new URLSearchParams({
    sf_url: url,
    sf_submit: '',
    new: '2',
    lang: 'en',
    app: '',
    country: 'en',
    os: 'Windows',
    browser: 'Chrome',
    channel: 'main',
    'sf-nomad': '1',
    url,
    ts: String(ts),
    _ts: '1720433117117',
    _tsc: '0',
    _s: getSaveFromHash(url, ts),
    _x: '1'
  });

  const r = await fetch('https://worker.savefrom.net/savefrom.php', {
    method: 'POST',
    headers: {
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': 'https://en.savefrom.net',
      'Referer': 'https://en.savefrom.net/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
    },
    body: form.toString()
  });

  const data = await r.text();
  const context: any = {
    results: null,
    parent: { document: { location: {} } },
    frameElement: {},
    atob: (b: string) => Buffer.from(b, 'base64').toString(),
    _decodeURIComponent: (uri: string) => {
      const decoded = decodeURIComponent(uri);
      if (/showResult/.test(decoded)) {
        context.results = decoded;
        return "true";
      }
      return decoded;
    }
  };
  vm.createContext(context);
  new vm.Script(`decodeURIComponent=_decodeURIComponent;${data}`).runInContext(context);

  const executed = context.results?.split('window.parent.sf.videoResult.show(')?.[1]
    || context.results?.split('window.parent.sf.videoResult.showRows(')?.[1];

  if (!executed) {
    throw new Error('SaveFrom returned empty result.');
  }

  let json = null;
  if (context.results.includes('showRows')) {
    const splits = executed.split('],"');
    const lastIndex = splits.findIndex((v: any) => v.includes('window.parent.sf.enableElement'));
    json = JSON.parse(splits.slice(0, lastIndex).join('],"') + ']');
  } else {
    json = [JSON.parse(executed.split(');')[0])];
  }
  return json;
}

async function resolveYouTubeHybrid(urlStr: string): Promise<any> {
  const cookie = process.env.YOUTUBE_COOKIE;
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

  // Fetch and run player JS to decipher/deobfuscate parameters
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

  // Parse dynamic class name
  const gClassPattern = /new\s+g\.([a-zA-Z0-9$_]+)\(\s*[a-zA-Z0-9$_]+\s*,\s*!0\s*\)/;
  const gClassMatch = body.match(gClassPattern);
  if (!gClassMatch) {
    throw new Error('Could not find parsed URL class name (g.className) in player script.');
  }
  const gClassName = gClassMatch[1];

  // VM Execution Setup
  const sandbox: any = {
    self: {},
    window: {},
    document: {
      createElement: () => ({ appendChild: () => {}, style: {}, addEventListener: () => {} }),
      querySelector: () => null,
      querySelectorAll: () => [],
      getElementById: () => null,
      addEventListener: () => {},
      currentScript: { src: playerUrl }
    },
    navigator: { userAgent: 'Mozilla/5.0', languages: ['en-US'] },
    location: { href: 'https://www.youtube.com/', hostname: 'www.youtube.com' },
    screen: { width: 1920, height: 1080 },
    history: {},
    XMLHttpRequest: Object.assign(function() {}, { prototype: { fetch: () => {} } }),
    setTimeout: () => {},
    setInterval: () => {},
    clearTimeout: () => {},
    clearInterval: () => {},
    Math, Date, String, Number, Array, Object, RegExp, parseInt, parseFloat,
    decodeURIComponent, encodeURIComponent
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

  // Resolve formats
  const resolvedFormats = [];
  for (const f of info.formats) {
    let finalUrl = f.url;
    if ((f as any).signatureCipher) {
      const cipherData = Object.fromEntries(new URLSearchParams((f as any).signatureCipher));
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

  // Find progressive MP4 formats (both video and audio)
  const mp4s = resolvedFormats.filter(f => f.url && f.container === 'mp4' && f.hasVideo && f.hasAudio);
  const preferred = mp4s.find(f => f.qualityLabel === '360p' || f.qualityLabel === '720p') || mp4s[0] || resolvedFormats[0];
  
  if (!preferred?.url) {
    throw new Error('No playable format found after deciphering.');
  }

  return {
    title,
    thumbnail,
    videoUrl: preferred.url,
    duration
  };
}

// Helper functions to decrypt Snapsave obfuscated responses
function decodeSnapSave(h: string, u: number, n: string, t: number, e: number, r: any): string {
  function decode(d: string, e: number, f: number): string {
    const g = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/'.split('');
    let h = g.slice(0, e);
    let i = g.slice(0, f);
    let j = d.split('').reverse().reduce(function (a: number, b: string, c: number) {
      if (h.indexOf(b) !== -1)
        return a += h.indexOf(b) * (Math.pow(e, c));
      return a;
    }, 0);
    let k = '';
    while (j > 0) {
      k = i[j % f] + k;
      j = (j - (j % f)) / f;
    }
    return k || '0';
  }
  r = '';
  for (let i = 0, len = h.length; i < len; i++) {
    let s = "";
    while (h[i] !== n[e]) {
      s += h[i];
      i++;
    }
    for (let j = 0; j < n.length; j++)
      s = s.replace(new RegExp(n[j], "g"), j.toString());
    r += String.fromCharCode(Number(decode(s, e, 10)) - t);
  }
  return decodeURIComponent(encodeURIComponent(r));
}

function decryptSnapSave(data: string): string {
  const parts = data.split('decodeURIComponent(escape(r))}(')[1].split('))')[0].split(',');
  const args: any[] = parts.map(v => v.replace(/"/g, '').trim());
  const decoded = decodeSnapSave(args[0], parseInt(args[1], 10), args[2], parseInt(args[3], 10), parseInt(args[4], 10), args[5]);
  const html = decoded.split('getElementById("download-section").innerHTML = "')[1]
      .split('"; document.getElementById("inputData").remove(); ')[0]
      .replace(/\\(\\)?/g, '');
  return html;
}

export function createApp() {
  const app = express();
  app.use(express.json());

  // API: Audio Transcription via Gemini API
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { fileUrl } = req.body;
      if (!fileUrl) {
        res.status(400).json({ error: "Missing fileUrl" });
        return;
      }

      const ai = getGeminiClient();
      console.log("Downloading audio file for transcription:", fileUrl);
      const audioResponse = await fetch(fileUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio file: ${audioResponse.statusText}`);
      }

      const arrayBuffer = await audioResponse.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString("base64");
      const mimeType = audioResponse.headers.get("content-type") || "audio/mp3";

      console.log("Sending transcription request to Gemini API...");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          "Transcribe the audio and include timestamps for each sentence or spoken segment in the format: [MM:SS] Text. Return only the transcription with timestamps, formatted neatly with line breaks. Do not add any introductory or concluding comments.",
        ],
      });

      const transcription = response.text || "No transcription text returned from Gemini API.";
      res.json({ transcription });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ error: error.message || "Internal server error during transcription." });
    }
  });

  // API: Resolve social media video URL
  app.post("/api/resolve-social", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        res.status(400).json({ error: "Missing 'url'." });
        return;
      }
      const isSafe = await validateSafeUrl(url);
      if (!isSafe) {
        res.status(403).json({ error: "Blocked: private/loopback URL." });
        return;
      }

      const lowerUrl = url.toLowerCase();
      const isYT = lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be");
      const isTT = lowerUrl.includes("tiktok.com");
      const isIG = lowerUrl.includes("instagram.com");
      const isFB = lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch");
      const isTW = lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com");
      const platform = isYT ? "YouTube" : isTT ? "TikTok" : isIG ? "Instagram" : isFB ? "Facebook" : isTW ? "Twitter/X" : "Web Video";

      let title = "", thumbnail = "", videoUrl = "", duration = "00:00";

      // ── 1. YouTube: Use SaveFrom Scraper (Self-contained)
      if (isYT) {
        try {
          const result = await resolveSaveFrom(url);
          if (result && result.length > 0) {
            const item = result[0];
            title = item.meta?.title || "";
            thumbnail = item.thumb || "";
            duration = item.meta?.duration || "00:00";
            
            // Filter progressive MP4 formats (both video and audio)
            const mp4s = item.url.filter((f: any) => f.url && f.ext === 'mp4' && !f.name.includes('no audio'));
            // Prefer googlevideo CDN URLs directly if present
            const preferred = mp4s.find((f: any) => f.url.includes('googlevideo.com')) || mp4s[0] || item.url[0];
            if (preferred?.url) {
              videoUrl = preferred.url;
              console.log("[SaveFrom-YT] Resolved:", title.slice(0, 40), "→", preferred.name);
            }
          }
        } catch (e: any) {
          console.warn("[SaveFrom-YT] Error:", e.message);
        }

        // Fallback to hybrid scraper if SaveFrom failed
        if (!videoUrl) {
          try {
            console.log("[Hybrid-YT] Resolving stream via ytdl-core + VM decipher...");
            const res = await resolveYouTubeHybrid(url);
            title = res.title;
            thumbnail = res.thumbnail;
            videoUrl = res.videoUrl;
            duration = res.duration;
            console.log("[Hybrid-YT] Resolved successfully:", title.slice(0, 40));
          } catch (e: any) {
            console.error("[Hybrid-YT] Error:", e.message);
          }
        }
      }

      // ── 2. TikTok, Facebook, Instagram, Twitter: Use Snapsave Scraper Action
      if (!videoUrl && (isTT || isFB || isIG || isTW)) {
        try {
          const snapsaveResponse = await fetch('https://snapsave.app/action.php?lang=en', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Origin': 'https://snapsave.app',
              'Referer': 'https://snapsave.app/en',
            },
            body: new URLSearchParams({ url })
          });

          if (snapsaveResponse.ok) {
            const code = await snapsaveResponse.text();
            const decodedHtml = decryptSnapSave(code);

            // Extract links from resolved HTML
            const links: string[] = [];
            const linkRegex = /href=\\"([^\\"]+)\\"/g;
            let match;
            while ((match = linkRegex.exec(decodedHtml)) !== null) {
              let cleanUrl = match[1].replace(/\\/g, '');
              if (cleanUrl.startsWith('/')) {
                cleanUrl = 'https://snapsave.app' + cleanUrl;
              }
              links.push(cleanUrl);
            }

            if (links.length > 0) {
              videoUrl = links[0]; // Choose first/best resolution link
              
              // Extract description/title if possible
              const titleMatch = decodedHtml.match(/<strong>(.*?)<\/strong>/);
              if (titleMatch) title = titleMatch[1];
              
              const thumbMatch = decodedHtml.match(/src=\\"([^\\"]+)\\"/);
              if (thumbMatch) thumbnail = thumbMatch[1].replace(/\\/g, '');
              
              console.log(`[Snapsave-${platform}] Resolved stream link!`);
            }
          }
        } catch (e: any) {
          console.warn(`[Snapsave-${platform}] Error:`, e.message);
        }
      }

      // ── 3. Metadata Scrape Fallback if title/thumb missing
      if (!title || !thumbnail) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 3000);
          const r = await fetch(url, { headers: { "User-Agent": "facebookexternalhit/1.1" }, signal: ctrl.signal });
          clearTimeout(t);
          if (r.ok) {
            const html = await r.text();
            if (!title) { const m = html.match(/property=["']og:title["'][^>]*content=["']([^"']+)["']/i) || html.match(/<title>([^<]+)<\/title>/i); if (m) title = m[1].replace(/&amp;/g, "&").trim(); }
            if (!thumbnail) { const m = html.match(/property=["']og:image["'][^>]*content=["']([^"']+)["']/i); if (m) thumbnail = m[1]; }
          }
        } catch { /**/ }
      }

      // ── 4. No video URL → 422
      if (!videoUrl) {
        res.status(422).json({ error: isYT
          ? "YouTube blocked the extraction. Please try another video or check your link."
          : `Could not extract download stream for this ${platform} link. The video might be private or restricted.` });
        return;
      }

      if (!title) title = `${platform} Video`;
      if (!thumbnail) thumbnail = {
        YouTube: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60",
        TikTok: "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=600&auto=format&fit=crop&q=60",
        Instagram: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
        "Twitter/X": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=60",
        Facebook: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format&fit=crop&q=60",
      }[platform] || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60";

      res.json({ success: true, title, thumbnail, videoUrl, duration, platform });
    } catch (err: any) {
      console.error("[resolve-social] Crash:", err);
      res.status(500).json({
        error: `Server Crash: ${err.message}`,
        stack: err.stack || "No stack trace available."
      });
    }
  });

  // API: Stream-proxy
  app.get("/api/media-proxy", async (req, res) => {
    try {
      const { url, filename } = req.query as Record<string, string>;
      if (!url) { res.status(400).json({ error: "Missing 'url'." }); return; }

      const isSafe = await validateSafeUrl(url);
      if (!isSafe) { res.status(403).json({ error: "Blocked URL." }); return; }

      console.log("[media-proxy] Fetching upstream URL:", url.slice(0, 80));
      const upstream = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });

      if (!upstream.ok) {
        throw new Error(`Upstream returned HTTP ${upstream.status} ${upstream.statusText}`);
      }

      const contentType = upstream.headers.get("content-type") || "video/mp4";
      const contentLength = upstream.headers.get("content-length");

      res.setHeader("Content-Type", contentType);
      if (contentLength) res.setHeader("Content-Length", contentLength);

      const downloadName = filename ? encodeURIComponent(filename) : "video.mp4";
      res.setHeader("Content-Disposition", `attachment; filename="${downloadName}"; filename*=UTF-8''${downloadName}`);
      res.setHeader("Access-Control-Allow-Origin", "*");

      // Pipe the response body directly — no buffering
      if (!upstream.body) { res.end(); return; }
      const reader = upstream.body.getReader();
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          const ok = res.write(value);
          if (!ok) await new Promise(r => res.once("drain", r));
        }
      };
      req.on("close", () => reader.cancel());
      await pump();
    } catch (err: any) {
      console.error("[media-proxy] Error:", err.message);
      if (!res.headersSent) res.status(500).json({ error: err.message });
    }
  });

  return app;
}

export default async (req: any, res: any) => {
  try {
    const app = createApp();
    app(req, res);
  } catch (err: any) {
    console.error("Vercel Bootstrapping Crash:", err);
    res.status(500).json({
      error: `Vercel Bootstrapping Crash: ${err.message}`,
      stack: err.stack || "No stack trace available."
    });
  }
};
