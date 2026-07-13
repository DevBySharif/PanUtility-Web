import express from "express";
import path from "path";
import dns from "dns";
import { promisify } from "util";
import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";
import vm from "vm";

const dnsLookup = promisify(dns.lookup);

// Lazy initialization of Gemini client
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

  app.post("/api/transcribe", async (req, res) => {
    res.json({ success: true, message: "transcribe stub" });
  });

  app.post("/api/resolve-social", async (req, res) => {
    res.json({ success: true, message: "resolve-social stub" });
  });

  app.get("/api/media-proxy", async (req, res) => {
    res.json({ success: true, message: "media-proxy stub" });
  });

  app.get("/api/test", (req, res) => {
    res.json({ success: true, message: "Route test matched with full code!" });
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
