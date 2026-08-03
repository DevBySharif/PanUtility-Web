process.env.NODE_ENV = 'production';
process.env.ALLOWED_ORIGINS ||= 'https://panutility.vercel.app';
await import('../server-dist/server.cjs');
