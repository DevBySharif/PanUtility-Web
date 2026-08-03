import { writeFile } from 'node:fs/promises';
import { INDEXABLE_TOOLS } from '../src/toolsData.ts';

const baseUrl = 'https://panutility.vercel.app';
const urls = [
  `${baseUrl}/`,
  ...INDEXABLE_TOOLS.map((tool) => `${baseUrl}/tools/${tool.id}`),
];

const body = urls.map((url, index) => [
  '  <url>',
  `    <loc>${url}</loc>`,
  `    <changefreq>${index === 0 ? 'weekly' : 'monthly'}</changefreq>`,
  `    <priority>${index === 0 ? '1.0' : '0.8'}</priority>`,
  '  </url>',
].join('\n')).join('\n');

await writeFile(new URL('../public/sitemap.xml', import.meta.url), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`, 'utf8');
console.log(`Generated sitemap with ${urls.length} URLs (${INDEXABLE_TOOLS.length} indexable tools).`);
