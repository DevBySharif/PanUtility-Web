import crypto from 'crypto';
import vm from 'vm';

const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

function getSaveFromHash(urlStr: string, ts: number): string {
  const salt = "b7944d7a59c9cb654228624880e7de59a53842c2d912b449fdf11febcf81cb21";
  return crypto.createHash("sha256").update(urlStr + ts + salt).digest("hex");
}

export default async (req: any, res: any) => {
  const ts = Date.now();
  const form = new URLSearchParams({
    sf_url: url,
    sf_submit: '',
    new: '2',
    lang: 'en',
    app: '',
    country: 'en',
    os: 'Windows',
    browser: 'Chrome',
    channel: 'main',
    'sf-nomad': '1',
    url,
    ts: String(ts),
    _ts: '1720433117117',
    _tsc: '0',
    _s: getSaveFromHash(url, ts),
    _x: '1'
  });

  try {
    const r = await fetch('https://worker.savefrom.net/savefrom.php', {
      method: 'POST',
      headers: {
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://en.savefrom.net',
        'Referer': 'https://en.savefrom.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36'
      },
      body: form.toString()
    });

    const data = await r.text();
    const context: any = {
      results: null,
      parent: { document: { location: {} } },
      frameElement: {},
      atob: (b: string) => Buffer.from(b, 'base64').toString(),
      _decodeURIComponent: (uri: string) => {
        const decoded = decodeURIComponent(uri);
        if (/showResult/.test(decoded)) {
          context.results = decoded;
          return "true";
        }
        return decoded;
      }
    };
    vm.createContext(context);
    new vm.Script(`decodeURIComponent=_decodeURIComponent;${data}`).runInContext(context);

    if (context.results) {
      res.json({
        success: true,
        message: "Successfully resolved YouTube video on Vercel!",
        containsShow: context.results.includes('videoResult.show'),
        titleMatch: context.results.match(/"title":"([^"]+)"/)?.[1] || "no title found",
        resultsLength: context.results.length
      });
    } else {
      res.json({
        success: false,
        error: "SaveFrom did not return any script results.",
        rawLength: data.length,
        rawPreview: data.slice(0, 500)
      });
    }
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: e.message,
      stack: e.stack
    });
  }
};
