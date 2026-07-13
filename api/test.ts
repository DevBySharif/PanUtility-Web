import path from "path";
import dns from "dns";
import { promisify } from "util";
import crypto from "crypto";
import vm from "vm";

const dnsLookup = promisify(dns.lookup);

export default async (req: any, res: any) => {
  try {
    const ip = await dnsLookup("google.com");
    res.json({ success: true, message: `Statically imported node modules! DNS worked: ${ip.address}` });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: `Static Node Modules Load Crash: ${err.message}`,
      stack: err.stack || "No stack trace available."
    });
  }
};
