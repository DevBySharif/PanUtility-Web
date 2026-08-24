process.env.NODE_ENV = 'production';
process.env.ALLOWED_ORIGINS ||= 'https://panutility.vercel.app';
process.env.PORT ||= process.env.E2E_PORT || '4173';
await import('../server-dist/server.cjs');
