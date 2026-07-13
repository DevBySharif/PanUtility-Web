import crypto from 'crypto';
import vm from 'vm';

function getSaveFromHash(url, ts) {
  const salt = "b7944d7a59c9cb654228624880e7de59a53842c2d912b449fdf11febcf81cb21";
  return crypto.createHash('sha256').update(url + ts + salt).digest('hex');
}

async function resolveSaveFrom(url) {
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
  const context = {
    results: null,
    parent: { document: { location: {} } },
    frameElement: {},
    atob: (b) => Buffer.from(b, 'base64').toString(),
    _decodeURIComponent: (uri) => {
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

  const executed = context.results?.split('window.parent.sf.videoResult.show(')?.[1]
    || context.results?.split('window.parent.sf.videoResult.showRows(')?.[1];

  if (!executed) {
    throw new Error('SaveFrom returned empty result.');
  }

  let json = null;
  if (context.results.includes('showRows')) {
    const splits = executed.split('],"');
    const lastIndex = splits.findIndex((v) => v.includes('window.parent.sf.enableElement'));
    json = JSON.parse(splits.slice(0, lastIndex).join('],"') + ']');
  } else {
    json = [JSON.parse(executed.split(');')[0])];
  }
  return json;
}

async function run() {
  const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  console.log('Resolving savefrom self-contained...');
  try {
    const res = await resolveSaveFrom(url);
    console.log('Success! Result title:', res[0].meta.title);
    console.log('Result thumb:', res[0].thumb);
    console.log('Result first format URL:', res[0].url[0].url.slice(0, 100));
  } catch (e) {
    console.error('Failed:', e.message);
  }
}

run();
