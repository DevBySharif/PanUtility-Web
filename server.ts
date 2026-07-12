import express from "express";
import path from "path";
import dns from "dns";
import { promisify } from "util";
import { createServer as createViteServer } from "vite";
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

  // API Route: Resolve and extract meta details from social media sharing links
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
      if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
        platform = "YouTube";
      } else if (lowerUrl.includes("tiktok.com")) {
        platform = "TikTok";
      } else if (lowerUrl.includes("instagram.com")) {
        platform = "Instagram";
      } else if (lowerUrl.includes("facebook.com") || lowerUrl.includes("fb.watch")) {
        platform = "Facebook";
      } else if (lowerUrl.includes("twitter.com") || lowerUrl.includes("x.com")) {
        platform = "Twitter/X";
      }

      // Default elements
      let title = "";
      let thumbnail = "";
      let videoUrl = "";
      let duration = "00:00";

      // ── Step 1: Race all Cobalt instances in parallel — fastest success wins
      // Vercel has a 10s function timeout, so we race with a 6s deadline max.
      const cobaltEndpoints = [
        "https://cobalt.api.red.velvet.ink/",
        "https://api.cobalt.tools/",
        "https://cobalt.catvibers.me/",
        "https://cobalt.drgns.space/",
        "https://api.cobalt.best/",
        "https://cobalt-api.lunes.host/",
        // v9 fallbacks
        "https://cobalt.api.red.velvet.ink/api/json",
        "https://api.cobalt.tools/api/json",
      ];

      const cobaltBody = JSON.stringify({
        url,
        vQuality: "720",
        videoQuality: "720",
        filenameStyle: "classic",
        isAudioOnly: false,
        disableMetadata: false,
      });

      // Helper: attempt one endpoint, resolve with { videoUrl, title } or reject
      const tryCobalt = async (endpoint: string): Promise<{ videoUrl: string; title: string; thumbnail?: string }> => {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Accept": "application/json", "Content-Type": "application/json" },
          body: cobaltBody,
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.status === "stream" || data.status === "tunnel" || data.status === "redirect") {
          return {
            videoUrl: data.url,
            title: data.filename ? data.filename.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim() : "",
            thumbnail: data.thumbnail || "",
          };
        }
        if (data.status === "picker" && data.picker?.length > 0) {
          return { videoUrl: data.picker[0].url, title: "", thumbnail: data.picker[0].thumb || "" };
        }
        throw new Error(`Cobalt status: ${data.status} (${data.error?.code || data.text || ""})`);
      };

      try {
        const result = await Promise.any(cobaltEndpoints.map(ep => tryCobalt(ep)));
        videoUrl = result.videoUrl;
        if (result.title) title = result.title;
        if (result.thumbnail) thumbnail = result.thumbnail;
        console.log("[Cobalt] Resolved:", videoUrl.slice(0, 60));
      } catch (err: any) {
        console.warn("[Cobalt] All instances failed:", err?.errors?.map((e: any) => e.message).join(" | ") || err.message);
      }

      // ── Step 2: YouTube oEmbed for metadata (title + thumbnail) if still missing
      if (platform === "YouTube" && (!title || !thumbnail)) {
        try {
          const ytId = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
          if (ytId) {
            const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`;
            const oembed = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) });
            if (oembed.ok) {
              const od = await oembed.json();
              if (!title && od.title) title = od.title;
              if (!thumbnail && od.thumbnail_url) thumbnail = od.thumbnail_url;
              if (!thumbnail) thumbnail = `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
            }
          }
        } catch (oeErr) {
          console.warn("[oEmbed] YouTube oEmbed failed:", oeErr);
        }
      }

      // ── Step 3: Lightweight HTML Open Graph scrape (title + thumbnail) for non-YouTube
      if (!title || !thumbnail) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3500);
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; facebookexternalhit/1.1)",
              "Accept": "text/html,application/xhtml+xml"
            },
            signal: controller.signal
          });
          clearTimeout(timeoutId);
          if (response.ok) {
            const html = await response.text();
            if (!title) {
              const m = html.match(/<meta\s+(?:property=["']og:title["']|name=["']twitter:title["'])\s+content=["']([^"']+)["']/i)
                     || html.match(/<title>([^<]+)<\/title>/i);
              if (m) title = m[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
            }
            if (!thumbnail) {
              const m = html.match(/<meta\s+(?:property=["']og:image["']|name=["']twitter:image["'])\s+content=["']([^"']+)["']/i);
              if (m) thumbnail = m[1];
            }
          }
        } catch (scrapeErr) {
          console.warn("[Scrape] HTML metadata failed:", scrapeErr);
        }
      }

      // ── Step 4: Bail with 422 if we couldn't resolve a real download URL
      if (!videoUrl) {
        res.status(422).json({
          error: "Could not resolve a direct download stream for this URL. The platform may be blocking extraction, or the URL may be private/invalid. Try pasting a direct .mp4 URL or use the DevTools Network sniffer method below."
        });
        return;
      }

      // Finalize display metadata (use sensible defaults if scraping also failed)
      if (!title) title = `${platform} Video`;
      if (!thumbnail) {
        const platformThumbs: Record<string, string> = {
          "YouTube": "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60",
          "TikTok": "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?w=600&auto=format&fit=crop&q=60",
          "Instagram": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=60",
          "Twitter/X": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&auto=format&fit=crop&q=60",
          "Facebook": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=600&auto=format&fit=crop&q=60",
        };
        thumbnail = platformThumbs[platform] || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=60";
      }

      res.json({
        success: true,
        title,
        thumbnail,
        videoUrl,
        duration,
        platform,
      });
    } catch (error: any) {
      console.error("Resolve social media error:", error);
      res.status(500).json({ error: error.message || "Internal server error during URL resolution." });
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
