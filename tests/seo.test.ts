import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_TOOLS, TOOL_REGISTRY } from '../src/toolsData';

describe('P1-A2 Production SEO Rendering & Static Prerendering', () => {
  it('robots.txt points to canonical sitemap URL on panutility.vercel.app', () => {
    expect(existsSync('public/robots.txt')).toBe(true);
    const content = readFileSync('public/robots.txt', 'utf8');
    expect(content).toContain('User-agent: *');
    expect(content).toContain('Allow: /');
    expect(content).toContain('Sitemap: https://panutility.vercel.app/sitemap.xml');
    expect(content).not.toContain('panutility.com');
  });

  it('sitemap.xml contains exactly 43 canonical URLs on panutility.vercel.app', () => {
    expect(existsSync('public/sitemap.xml')).toBe(true);
    const content = readFileSync('public/sitemap.xml', 'utf8');
    expect(content).not.toContain('panutility.com');

    const locs = content.match(/<loc>(https:\/\/panutility\.vercel\.app\/[^<]*)<\/loc>/g) || [];
    expect(locs).toHaveLength(43); // 1 homepage + 42 indexable tools
    expect(locs[0]).toContain('<loc>https://panutility.vercel.app/</loc>');

    for (const tool of INDEXABLE_TOOLS) {
      expect(content).toContain(`<loc>https://panutility.vercel.app/tools/${tool.id}</loc>`);
    }
  });

  it('index.html template contains lang="en", theme-color, canonical, Open Graph, and Twitter metadata', () => {
    expect(existsSync('index.html')).toBe(true);
    const html = readFileSync('index.html', 'utf8');

    expect(html).toMatch(/<html[^>]*lang="en"/);
    expect(html).toContain('<meta name="theme-color" content="#07080a" />');
    expect(html).toContain('<link rel="canonical" href="https://panutility.vercel.app/" />');
    expect(html).toContain('<meta property="og:site_name" content="PanUtility" />');
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:url" content="https://panutility.vercel.app/" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
  });

  it('prerendered dist/index.html contains WebSite and Organization JSON-LD and initial HTML grid', () => {
    if (!existsSync('dist/index.html')) return; // Run after build

    const html = readFileSync('dist/index.html', 'utf8');
    expect(html).toContain('<title>PanUtility - Universal Media &amp; Format Workstation</title>');
    expect(html).toContain('<link rel="canonical" href="https://panutility.vercel.app/" />');
    expect(html).toContain('application/ld+json');

    const jsonMatches = html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs) || [];
    expect(jsonMatches.length).toBeGreaterThanOrEqual(2);

    const parsedSchemas = jsonMatches.map((m) => JSON.parse(m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')));
    const types = parsedSchemas.map((s) => s['@type']);

    expect(types).toContain('WebSite');
    expect(types).toContain('Organization');
    expect(html).toContain('PanUtility Workstation');
    expect(html).toContain('/tools/image-converter');
  });

  it('prerendered dist/tools/image-converter/index.html contains tool-specific metadata, H1, and schemas', () => {
    if (!existsSync('dist/tools/image-converter/index.html')) return; // Run after build

    const html = readFileSync('dist/tools/image-converter/index.html', 'utf8');
    expect(html).toContain('<title>Image Format Converter - PanUtility</title>');
    expect(html).toContain('<link rel="canonical" href="https://panutility.vercel.app/tools/image-converter" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('<h1 class="text-3xl font-extrabold text-white tracking-tight mb-2">Image Format Converter</h1>');

    const jsonMatches = html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs) || [];
    expect(jsonMatches.length).toBe(2);

    const parsedSchemas = jsonMatches.map((m) => JSON.parse(m.replace(/<script[^>]*>/, '').replace(/<\/script>/, '')));
    const types = parsedSchemas.map((s) => s['@type']);

    expect(types).toContain('WebApplication');
    expect(types).toContain('BreadcrumbList');
  });

  it('prerendered dist/tools/pdf-compiler/index.html contains tool-specific metadata and H1', () => {
    if (!existsSync('dist/tools/pdf-compiler/index.html')) return; // Run after build

    const html = readFileSync('dist/tools/pdf-compiler/index.html', 'utf8');
    expect(html).toContain('<title>PDF Compiler (Images to PDF) - PanUtility</title>');
    expect(html).toContain('<link rel="canonical" href="https://panutility.vercel.app/tools/pdf-compiler" />');
    expect(html).toContain('<h1 class="text-3xl font-extrabold text-white tracking-tight mb-2">PDF Compiler (Images to PDF)</h1>');
  });

  it('prerendered dist/tools/json-formatter/index.html contains tool-specific metadata and H1', () => {
    if (!existsSync('dist/tools/json-formatter/index.html')) return; // Run after build

    const html = readFileSync('dist/tools/json-formatter/index.html', 'utf8');
    expect(html).toContain('<title>JSON Beautifier &amp; Validator - PanUtility</title>');
    expect(html).toContain('<link rel="canonical" href="https://panutility.vercel.app/tools/json-formatter" />');
    expect(html).toContain('<h1 class="text-3xl font-extrabold text-white tracking-tight mb-2">JSON Beautifier &amp; Validator</h1>');
  });

  it('all 42 indexable tools have unique titles and non-empty descriptions', () => {
    expect(INDEXABLE_TOOLS).toHaveLength(42);
    const titles = new Set(INDEXABLE_TOOLS.map((t) => t.name));
    const descriptions = new Set(INDEXABLE_TOOLS.map((t) => t.description));

    expect(titles.size).toBe(42);
    expect(descriptions.size).toBe(42);

    for (const tool of INDEXABLE_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(15);
      expect(tool.category).toBeTruthy();
    }
  });

  it('disabled and coming-soon tools are strictly excluded from indexability and static prerendering', () => {
    const nonIndexable = TOOL_REGISTRY.filter((t) => t.status === 'disabled' || t.status === 'coming-soon');
    expect(nonIndexable.length).toBe(71); // 20 disabled + 51 coming-soon = 71

    for (const tool of nonIndexable) {
      expect(tool.isIndexable).toBe(false);
      expect(tool.isFeatured).toBe(false);
      expect(existsSync(`dist/tools/${tool.id}/index.html`)).toBe(false);
    }
  });
});
