import { GoogleGenAI } from "@google/genai";

export default async (req: any, res: any) => {
  try {
    const ai = new GoogleGenAI({ apiKey: "test" });
    res.json({ success: true, message: "Statically imported @google/genai and created client!" });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Static GoogleGenAI Load Crash: ${err.message}`,
      stack: err.stack || "No stack trace available."
    });
  }
};
