export default async (req: any, res: any) => {
  try {
    console.log("Fetching instances.cobalt.best home page...");
    const r = await fetch('https://instances.cobalt.best/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await r.text();
    
    // Find script tags or links
    const links = html.match(/https?:\/\/[^\s'"()<>]+/g) || [];
    const jsonMatches = html.match(/\{[\s\S]+?\}/g) || [];
    
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
      stack: e.stack
    });
  }
};
