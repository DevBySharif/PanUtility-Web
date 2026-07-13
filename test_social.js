import { savefrom } from '@bochilteam/scraper-savefrom';
import { tiktokdl } from '@bochilteam/scraper-tiktok';
import { snapsave } from '@bochilteam/scraper-snapsave';

const tiktokUrl = 'https://www.tiktok.com/@mrbeast/video/7374026362541018410';
const facebookUrl = 'https://www.facebook.com/watch/?v=10158448924610190';

async function runTests() {
  // 1. TikTok Test
  console.log('--- Testing TikTok ---');
  try {
    const res = await tiktokdl(tiktokUrl);
    console.log('TikTok Success!');
    console.log('Description:', res.description);
    console.log('Watermark-free video:', res.video.noWatermark?.slice(0, 100));
  } catch (e) {
    console.error('TikTok Failed:', e.message);
  }

  // 2. Snapsave Test (Facebook & Instagram)
  console.log('\n--- Testing Snapsave for Facebook ---');
  try {
    const res = await snapsave(facebookUrl);
    console.log('Snapsave Facebook Success!');
    console.log('Title:', res.title);
    console.log('Results:', res.results.map(r => `${r.resolution} -> ${r.url ? r.url.slice(0, 80) : 'none'}`));
  } catch (e) {
    console.error('Snapsave Facebook Failed:', e.message);
  }
}

runTests();
