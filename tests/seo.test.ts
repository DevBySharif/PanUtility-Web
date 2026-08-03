import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { INDEXABLE_TOOLS, TOOL_REGISTRY } from '../src/toolsData';

describe('P1-A Technical SEO Foundation', () => {
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

  it('index.html contains lang="en", theme-color, canonical, Open Graph, and Twitter metadata', () => {
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

  it('disabled and coming-soon tools are strictly excluded from indexability', () => {
    const nonIndexable = TOOL_REGISTRY.filter((t) => t.status === 'disabled' || t.status === 'coming-soon');
    expect(nonIndexable.length).toBe(71); // 20 disabled + 51 coming-soon = 71

    for (const tool of nonIndexable) {
      expect(tool.isIndexable).toBe(false);
      expect(tool.isFeatured).toBe(false);
    }
  });
});
