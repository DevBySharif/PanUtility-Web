// Re-export from lib/ — this file is kept for local-dev/test import compatibility.
// Vercel does NOT treat this as a function endpoint because api/index.ts is the only entry.
export * from '../../lib/security/outbound.ts';
