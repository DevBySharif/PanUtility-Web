import ytdl from '@distube/ytdl-core';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

try {
  const info = await ytdl.getInfo(url);
  const formats = info.formats;
  const videoAudio = formats.filter(f => f.hasVideo && f.hasAudio);
  if (videoAudio.length > 0) {
    const best = videoAudio.sort((a, b) => (b.height || 0) - (a.height || 0))[0];
    console.log('Testing url:', best.url);
    const r = await fetch(best.url, { method: 'HEAD' });
    console.log('HTTP status:', r.status);
  } else {
    console.log('No video+audio formats found!');
  }
} catch (e) {
  console.error('Error:', e.message);
}
