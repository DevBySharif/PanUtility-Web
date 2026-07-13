import express from "express";
import path from "path";
import dns from "dns";
import { promisify } from "util";
import { GoogleGenAI } from "@google/genai";

const dnsLookup = promisify(dns.lookup);

const PORT = 3000;

// Lazy initialization of Gemini client to prevent startup crashes when key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please provide it in the Settings > Secrets menu.");
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
    
    if (ip.startsWith("172.")) {
      const parts = ip.split(".");
      if (parts.length >= 2) {
        const secondOctet = parseInt(parts[1], 10);
        if (secondOctet >= 16 && secondOctet <= 31) {
          return false;
        }
      }
    }

    if (
      ip === "::1" ||
      ip.startsWith("fe80:") ||
      ip.startsWith("fc") ||
      ip.startsWith("fd")
    ) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
}

export async function bootstrap() {
  const app = express();

  // Increase body size limit for base64 audio uploads
  app.use(express.json({ limit: "50mb" }));

  // API Route: Transcribe audio using Gemini
  app.post("/api/transcribe", async (req, res) => {
    try {
      const { audio, mimeType } = req.body;
      
      if (!audio || !mimeType) {
        res.status(400).json({ error: "Missing 'audio' (base64 string) or 'mimeType' in request body." });
        return;
      }

      const ai = getGeminiClient();
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            inlineData: {
              mimeType: mimeType,
              data: audio,
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

  // ─────────────────────────────────────────────────────────────────────────
  // API: Resolve social media video URL → title, thumbnail, duration, stream
  // ─────────────────────────────────────────────────────────────────────────
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

      // ── 1. YouTube: use InnerTube ANDROID client (returns direct, non-encrypted stream URLs)
      if (isYT) {
        const ytId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        if (ytId) {
          const ctrl = new AbortController();
          const to = setTimeout(() => ctrl.abort(), 12000);
          try {
            const pr = await fetch("https://www.youtube.com/youtubei/v1/player", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "User-Agent": "com.google.android.youtube/17.31.35 (Linux; U; Android 11) gzip",
                "X-Goog-Api-Format-Version": "2",
                "Accept-Language": "en-US,en;q=0.9",
              },
              body: JSON.stringify({
                videoId: ytId,
                context: {
                  client: {
                    clientName: "ANDROID",
                    clientVersion: "17.31.35",
                    androidSdkVersion: 30,
                    hl: "en",
                    gl: "US",
                    utcOffsetMinutes: 0,
                  },
                },
              }),
              signal: ctrl.signal,
            });
            clearTimeout(to);

            if (pr.ok) {
              const pd = await pr.json();
              const vd = pd.videoDetails;
              if (vd?.title) title = vd.title;
              if (vd?.thumbnail?.thumbnails?.length) {
                const thumbs = vd.thumbnail.thumbnails;
                thumbnail = thumbs[thumbs.length - 1].url;
              }
              if (!thumbnail) thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
              const secs = parseInt(vd?.lengthSeconds || "0", 10);
              if (secs) duration = `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;

              // formats = combined video+audio (ANDROID client returns direct url, no cipher)
              const formats: any[] = pd.streamingData?.formats || [];
              // Sort: prefer 720p, then highest quality
              const sorted = [...formats].sort((a, b) => (b.height || 0) - (a.height || 0));
              const best = sorted.find(f => f.url && (f.height || 999) <= 720) || sorted.find(f => f.url);
              if (best?.url) {
                videoUrl = best.url;
                console.log("[InnerTube] Resolved:", title.slice(0, 50), "→", best.qualityLabel);
              } else {
                console.warn("[InnerTube] No direct URL in formats. playabilityStatus:", pd.playabilityStatus?.status);
              }
            }
          } catch (e: any) {
            console.warn("[InnerTube] Error:", e.message);
          } finally {
            clearTimeout(to);
          }
        }
      }

      // ── 2. Cobalt race for all platforms (including YouTube fallback)
      if (!videoUrl) {
        const cobaltEndpoints = [
          "https://cobalt.api.red.velvet.ink/",
          "https://api.cobalt.tools/",
          "https://cobalt.catvibers.me/",
          "https://api.cobalt.best/",
          "https://cobalt.api.red.velvet.ink/api/json",
          "https://api.cobalt.tools/api/json",
        ];
        const cobaltBody = JSON.stringify({ url, vQuality: "720", videoQuality: "720", filenameStyle: "classic" });
        const tryCobalt = async (ep: string) => {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 6000);
          try {
            const r = await fetch(ep, {
              method: "POST",
              headers: { Accept: "application/json", "Content-Type": "application/json" },
              body: cobaltBody,
              signal: ctrl.signal,
            });
            clearTimeout(t);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            if (["stream", "tunnel", "redirect"].includes(d.status)) {
              return { videoUrl: d.url as string, title: (d.filename || "").replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim(), thumbnail: d.thumbnail || "" };
            }
            if (d.status === "picker" && d.picker?.length) {
              return { videoUrl: d.picker[0].url as string, title: "", thumbnail: d.picker[0].thumb || "" };
            }
            throw new Error(`status=${d.status}`);
          } finally { clearTimeout(t); }
        };
        try {
          const r = await Promise.any(cobaltEndpoints.map(ep => tryCobalt(ep)));
          videoUrl = r.videoUrl;
          if (!title && r.title) title = r.title;
          if (!thumbnail && r.thumbnail) thumbnail = r.thumbnail;
          console.log("[Cobalt] Resolved:", videoUrl.slice(0, 60));
        } catch { console.warn("[Cobalt] All instances failed."); }
      }

      // ── 3. Metadata fallback: YouTube oEmbed or OG scrape
      if (!title || !thumbnail) {
        if (isYT) {
          const ytId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
          if (ytId) {
            try {
              const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`);
              if (oe.ok) { const od = await oe.json(); if (!title) title = od.title; if (!thumbnail) thumbnail = `https://img.youtube.com/vi/${ytId}/maxresdefault.jpg`; }
            } catch { /**/ }
          }
        } else {
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
      }

      // ── 4. No video URL → 422
      if (!videoUrl) {
        res.status(422).json({ error: isYT
          ? "YouTube blocked the extraction. The video may be age-restricted or region-locked. Try another video."
          : "Could not extract a stream URL for this link. The platform may require login or has blocked automated access." });
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

  // ─────────────────────────────────────────────────────────────────────────
  // API: Stream-proxy — pipes external video through our server with the
  // correct Content-Disposition so the browser triggers a file download.
  // Uses Node.js streaming (no buffering) to handle large files.
  // ─────────────────────────────────────────────────────────────────────────
  app.get("/api/media-proxy", async (req, res) => {
    try {
      const { url, filename } = req.query as Record<string, string>;
      if (!url) { res.status(400).json({ error: "Missing 'url'." }); return; }

      const isSafe = await validateSafeUrl(url);
      if (!isSafe) { res.status(403).json({ error: "Blocked URL." }); return; }

      // Support Range requests (allows browser seek & resume)
      const rangeHeader = req.headers.range;
      const fetchHeaders: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "video/mp4,video/*;q=0.9,*/*;q=0.8",
      };
      if (rangeHeader) fetchHeaders["Range"] = rangeHeader;

      const upstream = await fetch(url, { headers: fetchHeaders });
      if (!upstream.ok && upstream.status !== 206) {
        res.status(upstream.status).json({ error: `Upstream returned ${upstream.status}` });
        return;
      }

      const ct = upstream.headers.get("Content-Type") || "video/mp4";
      const cl = upstream.headers.get("Content-Length");
      const cr = upstream.headers.get("Content-Range");
      const safeFilename = (filename || path.basename(new URL(url).pathname) || "video").replace(/[^a-zA-Z0-9._-]/g, "_");

      res.status(upstream.status === 206 ? 206 : 200);
      res.setHeader("Content-Type", ct);
      res.setHeader("Content-Disposition", `attachment; filename="${safeFilename}.mp4"`);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Access-Control-Allow-Origin", "*");
      if (cl) res.setHeader("Content-Length", cl);
      if (cr) res.setHeader("Content-Range", cr);

      // Pipe the response body directly — no buffering, handles large files
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

  // Integration of Vite Dev Server in development / serve static files in production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
  return app;
}

if (process.env.VERCEL !== "1") {
  bootstrap().catch((err) => {
    console.error("Bootstrapping server failed:", err);
    process.exit(1);
  });
}
