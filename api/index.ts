import { createApp } from "../app";

let appPromise: any = null;

export default async (req: any, res: any) => {
  try {
    if (!appPromise) {
      appPromise = Promise.resolve(createApp());
    }
    const app = await appPromise;
    app(req, res);
  } catch (err: any) {
    console.error("Vercel Bootstrapping Crash:", err);
    res.status(500).json({
      error: `Vercel Bootstrapping Crash: ${err.message}`,
      stack: err.stack || "No stack trace available."
    });
  }
};
