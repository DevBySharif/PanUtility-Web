import { savefrom } from '@bochilteam/scraper-savefrom';

const urls = [
  'https://www.tiktok.com/@mrbeast/video/7374026362541018410',
  'https://www.facebook.com/watch/?v=10158448924610190',
];

for (const url of urls) {
  console.log(`\nTesting URL: ${url}`);
  try {
    const res = await savefrom(url);
    console.log('Result count:', res.length);
    if (res.length > 0) {
      const item = res[0];
      console.log('Title:', item.meta.title);
      console.log('Formats found:', item.url.length);
      item.url.slice(0, 3).forEach((f, idx) => {
        console.log(`  Format ${idx}:`, {
          name: f.name,
          ext: f.ext,
          url: f.url ? f.url.slice(0, 100) + '...' : 'none'
        });
      });
    } else {
      console.log('No result returned!');
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
}
