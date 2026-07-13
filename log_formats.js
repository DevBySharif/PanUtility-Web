import { savefrom } from '@bochilteam/scraper-savefrom';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

try {
  const res = await savefrom(url);
  if (res.length > 0) {
    const item = res[0];
    console.log('Available formats details:');
    item.url.forEach((f, idx) => {
      console.log(`Format ${idx}:`, {
        name: f.name,
        ext: f.ext,
        type: f.type,
        url: f.url ? f.url.slice(0, 80) + '...' : 'none'
      });
    });
  }
} catch (e) {
  console.error(e);
}
