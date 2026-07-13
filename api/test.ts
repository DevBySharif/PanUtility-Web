import express from "express";

export default async (req: any, res: any) => {
  try {
    const app = express();
    res.json({ success: true, message: "Statically imported express and created app!" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Static Express Load Crash: ${err.message}`,
      stack: err.stack || "No stack trace available."
    });
  }
};
