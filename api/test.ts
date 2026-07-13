import { createApp } from "../app";

export default async (req: any, res: any) => {
  try {
    createApp();
    res.json({ success: true, message: "Statically imported and called createApp!" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Test Route Import Crash: ${err.message}`,
      stack: err.stack || "No stack trace available."
    });
  }
};
