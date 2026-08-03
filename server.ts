import express from "express";
import path from "path";
import { createApp } from "./api/index";

const PORT = 3000;

export async function bootstrap() {
  const app = createApp();

  app.use((_req, res, next) => {
    const developmentSources = process.env.NODE_ENV !== 'production' ? " 'unsafe-inline'" : '';
    const developmentConnections = process.env.NODE_ENV !== 'production' ? ' ws:' : '';
    res.setHeader('Content-Security-Policy', `default-src 'self'; script-src 'self'${developmentSources}; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://api.qrserver.com https://images.unsplash.com; media-src 'self' blob:; connect-src 'self'${developmentConnections}; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`);
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), geolocation=(), payment=(), usb=()');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Integration of Vite Dev Server in development / serve static files in production
  if (process.env.VERCEL !== "1" && process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite middleware...");
    const viteModuleName = "vite";
    const { createServer: createViteServer } = await import(viteModuleName);
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, { setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      else if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      else res.setHeader('Cache-Control', 'public, max-age=3600');
    } }));
    app.get("/tools/*", (req, res) => {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
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
