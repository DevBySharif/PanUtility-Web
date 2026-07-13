export default async (req: any, res: any) => {
  try {
    const { bootstrap } = await import("../server");
    const app = await bootstrap();
    app(req, res);
  } catch (err: any) {
    console.error("Vercel Cold Start Crash:", err);
    res.status(500).json({
      error: `Vercel Cold Start Crash: ${err.message}`,
      stack: err.stack || "No stack trace available."
    });
  }
};
