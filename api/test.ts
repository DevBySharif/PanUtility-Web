import ytdl from "@distube/ytdl-core";

export default async (req: any, res: any) => {
  const videoUrl = 'https://youtu.be/G6OCJa1jBdY';
  const results: any = { videoUrl };

  // Test 1: SaveFrom
  try {
    const ts = Date.now();
    const crypto = await import("crypto");
    const salt = "b7944d7a59c9cb654228624880e7de59a53842c2d912b449fdf11febcf81cb21";
    const hash = crypto.default.createHash("sha256").update(videoUrl + ts + salt).digest("hex");
    const form = new URLSearchParams({
      sf_url: videoUrl, sf_submit: '', new: '2', lang: 'en',
      app: '', country: 'en', os: 'Windows', browser: 'Chrome',
      channel: 'main', 'sf-nomad': '1', url: videoUrl,
      ts: String(ts), _ts: '1720433117117', _tsc: '0', _s: hash, _x: '1'
    });
    const r = await fetch('https://worker.savefrom.net/savefrom.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://en.savefrom.net',
        'Referer': 'https://en.savefrom.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: form.toString()
    });
    results.savefrom = { status: r.status, contentType: r.headers.get('content-type') };
    const text = await r.text();
    results.savefrom.responsePreview = text.slice(0, 300);
  } catch (e: any) {
    results.savefrom = { error: e.message };
  }

  // Test 2: ytdl.getInfo
  try {
    const info = await ytdl.getInfo(videoUrl);
    results.ytdl = {
      title: info.videoDetails.title,
      formatsCount: info.formats.length,
      playerUrl: info.html5player,
    };
  } catch (e: any) {
    results.ytdl = { error: e.message, stack: e.stack?.slice(0, 500) };
  }

  // Test 3: Invidious public API
  try {
    const videoId = 'G6OCJa1jBdY';
    const r = await fetch(`https://inv.nadeko.net/api/v1/videos/${videoId}?fields=title,adaptiveFormats,formatStreams`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    results.invidious = { status: r.status };
    if (r.ok) {
      const data: any = await r.json();
      results.invidious.title = data.title;
      results.invidious.formatsCount = (data.formatStreams || []).length + (data.adaptiveFormats || []).length;
      const mp4 = (data.formatStreams || []).find((f: any) => f.container === 'mp4');
      results.invidious.sampleUrl = mp4?.url?.slice(0, 100);
    } else {
      results.invidious.body = (await r.text()).slice(0, 200);
    }
  } catch (e: any) {
    results.invidious = { error: e.message };
  }

  res.json(results);
};
