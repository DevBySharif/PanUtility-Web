export default async (req: any, res: any) => {
  const log: string[] = [];
  try {
    log.push("Importing express...");
    await import("express");
    log.push("Express import success!");

    log.push("Importing @google/genai...");
    await import("@google/genai");
    log.push("@google/genai import success!");

    log.push("Importing crypto...");
    await import("crypto");
    log.push("Crypto import success!");

    log.push("Importing vm...");
    await import("vm");
    log.push("Vm import success!");

    log.push("Importing dns...");
    await import("dns");
    log.push("Dns import success!");

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
