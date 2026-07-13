export default async (req: any, res: any) => {
  try {
    console.log("Fetching cobalt.directory home page...");
    const r = await fetch('https://cobalt.directory/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await r.text();
    
    // Find script tags or links
    const links = html.match(/https?:\/\/[^\s'"()<>]+/g) || [];
    
    res.json({
      success: true,
      status: r.status,
      htmlLength: html.length,
      linksFound: links.slice(0, 50),
      htmlPreview: html.slice(0, 1000)
    });
  } catch (e: any) {
    res.status(500).json({
      success: false,
      error: e.message,
      cause: e.cause ? { message: e.cause.message, code: e.cause.code } : null,
      stack: e.stack
    });
  }
};
