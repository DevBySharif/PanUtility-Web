import express from "express";
import path from "path";
import dns from "dns";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import ytdl from "@distube/ytdl-core";

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

  // API Route: Resolve and extract details from social media sharing links
  app.post("/api/resolve-social", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== "string") {
        res.status(400).json({ error: "Missing or invalid 'url' in request body." });
        return;
      }

      const isSafe = await validateSafeUrl(url);
      if (!isSafe) {
        res.status(403).json({ error: "Access to private, loopback or local network resources is strictly prohibited." });
        return;
      }

      const lowerUrl = url.toLowerCase();
      let platform = "Supported Platform";
      const isYouTube = lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be");
      if (isYouTube) platform = "YouTube";
      else if (lowerUrl.includes("tiktok.com")) platform = "TikTok";
      else if (lowerUrl.includes("instagram.com")) platform = "Instagram";
      else if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch")) platform = "Facebook";
      else if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) platform = "Twitter/X";

      let title = "";
      let thumbnail = "";
      let videoUrl = "";
      let duration = "00:00";

      // ── Step 1: For YouTube → use ytdl-core (reliable, pure JS, works on Vercel)
      if (isYouTube) {
        try {
          const info = await ytdl.getInfo(url);
          const details = info.videoDetails;

          title = details.title;
          thumbnail = details.thumbnails?.sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.url || `https://img.youtube.com/vi/${details.videoId}/hqdefault.jpg`;
          const secs = parseInt(details.lengthSeconds, 10);
          const mm = String(Math.floor(secs / 60)).padStart(2, "0");
          const ss = String(secs % 60).padStart(2, "0");
          duration = `${mm}:${ss}`;

          // Pick best video+audio format (≤720p)
          const fmt = ytdl.chooseFormat(info.formats, { quality: "highestvideo", filter: f => f.hasVideo && f.hasAudio && (f.height || 9999) <= 720 })
            || ytdl.chooseFormat(info.formats, { quality: "highest", filter: "videoandaudio" });
          if (fmt) videoUrl = fmt.url;
          console.log("[ytdl] Resolved YouTube:", title.slice(0, 50));
        } catch (ytErr: any) {
          console.warn("[ytdl] Failed:", ytErr.message);
        }
      }

      // ── Step 2: For non-YouTube (or if ytdl failed) → race Cobalt instances
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

        const tryCobalt = async (endpoint: string): Promise<{ videoUrl: string; title: string; thumbnail: string }> => {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 5000);
          try {
            const r = await fetch(endpoint, {
              method: "POST",
              headers: { "Accept": "application/json", "Content-Type": "application/json" },
              body: cobaltBody,
              signal: ctrl.signal,
            });
            clearTimeout(t);
            if (!r.ok) throw new Error(`HTTP ${r.status}`);
            const d = await r.json();
            if (d.status === "stream" || d.status === "tunnel" || d.status === "redirect") {
              return {
                videoUrl: d.url,
                title: d.filename ? d.filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() : "",
                thumbnail: d.thumbnail || "",
              };
            }
            if (d.status === "picker" && d.picker?.length > 0) {
              return { videoUrl: d.picker[0].url, title: "", thumbnail: d.picker[0].thumb || "" };
            }
            throw new Error(`status=${d.status}`);
          } finally {
            clearTimeout(t);
          }
        };

        try {
          const result = await Promise.any(cobaltEndpoints.map(ep => tryCobalt(ep)));
          videoUrl = result.videoUrl;
          if (!title && result.title) title = result.title;
          if (!thumbnail && result.thumbnail) thumbnail = result.thumbnail;
          console.log("[Cobalt] Resolved:", videoUrl.slice(0, 60));
        } catch (cobaltErr: any) {
          console.warn("[Cobalt] All instances failed.");
        }
      }

      // ── Step 3: HTML OG scrape for metadata (title + thumbnail) if still missing
      if (!title || !thumbnail) {
        try {
          const ctrl = new AbortController();
          const t = setTimeout(() => ctrl.abort(), 3000);
          const r = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0 (compatible; facebookexternalhit/1.1)", "Accept": "text/html" },
            signal: ctrl.signal,
          });
          clearTimeout(t);
          if (r.ok) {
            const html = await r.text();
            if (!title) {
              const m = html.match(/<meta\s+(?:property=["']og:title["']|name=["']twitter:title["'])\s+content=["']([^"']+)["']/i)
                       || html.match(/<title>([^<]+)<\/title>/i);
              if (m) title = m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();
            }
            if (!thumbnail) {
              const m = html.match(/<meta\s+(?:property=["']og:image["']|name=["']twitter:image["'])\s+content=["']([^"']+)["']/i);
              if (m) thumbnail = m[1];
            }
          }
        } catch { /* ignore */ }
      }

      // ── Step 4: No stream resolved → honest 422 error
      if (!videoUrl) {
        res.status(422).json({
          error: platform === "YouTube"
            ? "Could not extract this YouTube video. It may be age-restricted, private, or region-locked. Try a different video."
            : "Could not resolve a download stream for this URL. The platform may be blocking extraction, or the content may be private. Try pasting a direct .mp4 URL instead."
        });
        return;
      }

      // Finalize metadata defaults
      if (!title) title = `${platform} Video`;
      if (!thumbnail) {
        const thumbMap: Record<string, string> = {
          "YouTube": "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60",
          "TikTok": "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=600&auto=format&fit=crop&q=60",
          "Instagram": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
          "Twitter/X": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=60",
          "Facebook": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format&fit=crop&q=60",
        };
        thumbnail = thumbMap[platform] || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60";
      }

      res.json({ success: true, title, thumbnail, videoUrl, duration, platform });

    } catch (error: any) {
      console.error("[resolve-social] Unhandled error:", error.message);
      res.status(500).json({ error: error.message || "Internal server error." });
    }
  });

  // API Route: Secure Media proxy that fetches external files and streams them back to bypass CORS blocks
  app.get("/api/media-proxy", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== "string") {
        res.status(400).json({ error: "Missing or invalid 'url' query parameter." });
        return;
      }

      const parsedUrl = new URL(url);
      const isSafe = await validateSafeUrl(url);
      if (!isSafe) {
        res.status(403).json({ error: "Access to private, loopback or local network resources is strictly prohibited." });
        return;
      }

      // Fetch the target media
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (!response.ok) {
        res.status(response.status).json({ error: `Failed to fetch external media stream. Status: ${response.status}` });
        return;
      }

      // Extract details
      const contentType = response.headers.get("Content-Type") || "video/mp4";
      const contentLength = response.headers.get("Content-Length");

      res.setHeader("Content-Type", contentType);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      
      const fileBase = path.basename(parsedUrl.pathname) || "downloaded_hd_media.mp4";
      res.setHeader("Content-Disposition", `attachment; filename="${fileBase}"`);

      // Read chunk as arrayBuffer and send
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      res.send(buffer);
    } catch (error: any) {
      console.error("Media proxy error:", error);
      res.status(500).json({ error: error.message || "Internal server error during media proxy transfer." });
    }
  });

  // Integration of Vite Dev Server in development / serve static files in production
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
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
