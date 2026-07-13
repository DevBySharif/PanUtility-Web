export default async (req: any, res: any) => {
  const log: string[] = [];
  try {
    log.push("Dynamic import of ./index...");
    const mod = await import("./index");
    log.push("Import success! Instantiating app...");
    mod.createApp();
    log.push("createApp success!");
    res.json({ success: true, log });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      log,
      error: err.message,
      stack: err.stack || "No stack trace available."
    });
  }
};
