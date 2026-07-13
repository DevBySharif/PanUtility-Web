import express from "express";
import path from "path";
import dns from "dns";
import { promisify } from "util";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import vm from "vm";

const dnsLookup = promisify(dns.lookup);

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

async function validateSafeUrl(urlStr: string): Promise<boolean> {
  try {
    const parsedUrl = new URL(urlStr);
    const hostname = parsedUrl.hostname.toLowerCase();
    const lookupResult = await dnsLookup(hostname);
    return !!lookupResult.address;
  } catch {
    return false;
  }
}

function getSaveFromHash(url: string, ts: number): string {
  const salt = "b7944d7a59c9cb654228624880e7de59a53842c2d912b449fdf11febcf81cb21";
  return crypto.createHash("sha256").update(url + ts + salt).digest("hex");
}

async function resolveSaveFrom(url: string): Promise<any> {
  return [];
}

function decodeSnapSave(h: string, u: number, n: string, t: number, e: number, r: any): string {
  return "";
}

function decryptSnapSave(data: string): string {
  return "";
}

export function createApp() {
  const app = express();
  app.use(express.json());

  app.post("/api/resolve-social", (req, res) => {
    res.json({ success: true, message: "Route resolve-social matched!" });
  });

  app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "Route test matched!" });
  });

  return app;
}

let lastError: any = null;
process.on("uncaughtException", (err) => {
  lastError = { type: "uncaughtException", message: err.message, stack: err.stack };
});
process.on("unhandledRejection", (reason: any) => {
  lastError = { type: "unhandledRejection", message: reason?.message || String(reason), stack: reason?.stack };
});

export default async (req: any, res: any) => {
  try {
    const app = createApp();
    
    // Intercept response to check if it succeeded
    const originalJson = res.json;
    let responseSent = false;
    res.json = function(body: any) {
      responseSent = true;
      return originalJson.call(this, body);
    };

    app(req, res);

    // Give a short delay to let any async operation run or crash
    await new Promise(resolve => setTimeout(resolve, 500));

    if (lastError) {
      res.status(500).json({ success: false, error: lastError });
    } else if (!responseSent) {
      res.json({ success: true, message: "Request passed to Express, but no response was sent yet." });
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Execution Crash: ${err.message}`,
      stack: err.stack || "No stack trace available."
    });
  }
};
