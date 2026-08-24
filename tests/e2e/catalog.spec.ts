import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

type GeneratedPngSpec = {
  name: string;
  left: string;
  right: string;
};

function failOnConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return () => expect(errors, `browser console errors: ${errors.join('\n')}`).toEqual([]);
}

async function uploadGeneratedPngs(page: Page, selector: string, files: GeneratedPngSpec[]) {
  await page.locator(selector).waitFor({ state: 'attached', timeout: 10_000 });
  await page.evaluate(async ({ selector, files }) => {
    const input = document.querySelector(selector);
    if (!(input instanceof HTMLInputElement)) throw new Error(`Missing file input: ${selector}`);

    const transfer = new DataTransfer();
    for (const file of files) {
      const canvas = document.createElement('canvas');
      canvas.width = 40;
      canvas.height = 40;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.fillStyle = file.left;
      ctx.fillRect(0, 0, 20, 40);
      ctx.fillStyle = file.right;
      ctx.fillRect(20, 0, 20, 40);
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG generation failed')), 'image/png');
      });
      transfer.items.add(new File([blob], file.name, { type: 'image/png' }));
    }

    input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, { selector, files });
}

test('homepage loads without browser errors', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Universal Utility Suite/i })).toBeVisible();
  assertNoErrors();
});

test('search finds and opens a functional tool', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  await page.goto('/');
  await page.getByPlaceholder(/tools by name/i).fill('Image Format Converter');
  await page.getByRole('heading', { name: 'Image Format Converter' }).click();
  await expect(page).toHaveURL(/\/tools\/image-converter$/);
  await expect(page.getByText('Functional', { exact: true })).toBeVisible();
  assertNoErrors();
});

test('homepage surfaces only public functional tools', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Image Format Converter' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'JSON Beautifier & Validator' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'GIF Converter & Maker' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Video Compressor' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Scientific Algebra Calculator' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Social Video Downloader' })).toHaveCount(0);
});

test('search does not surface non-public tools', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder(/tools by name/i).fill('Social Video Downloader');
  await expect(page.getByRole('heading', { name: /No tools found/i })).toBeVisible();
});

test('opens a beta route without contacting providers', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  await page.goto('/tools/gif-maker');
  await expect(page.getByText('Beta', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: /GIF/i })).toBeVisible();
  assertNoErrors();
});

test('opens a coming-soon route honestly', async ({ page }) => {
  await page.goto('/tools/video-compressor');
  await expect(page.getByText('Coming Soon', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/processing for this tool is not implemented/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /convert|execute|download/i })).toHaveCount(0);
});

test('opens a disabled route without mounting its implementation', async ({ page }) => {
  await page.goto('/tools/scientific-calc');
  await expect(page.getByText('Temporarily Unavailable', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/executed user input as JavaScript/i)).toBeVisible();
  await expect(page.getByRole('button', { name: '=' })).toHaveCount(0);
});

test('shows the audio transcriber as unavailable in the free deployment', async ({ page }) => {
  await page.goto('/tools/audio-transcriber');
  await expect(page.getByText('Temporarily Unavailable', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Server-based transcription is temporarily unavailable in the free deployment/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /transcribe|start recording|upload audio/i })).toHaveCount(0);
});

test('shows not found for an unknown route', async ({ page }) => {
  const response = await page.goto('/tools/not-a-real-tool');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: 'Tool not found' })).toBeVisible();
});

test('direct known tool URL navigation works', async ({ page }) => {
  await page.goto('/tools/json-formatter');
  await expect(page.getByRole('heading', { name: 'JSON Beautifier & Validator' })).toBeVisible();
});

test('interacts with functional tools without console errors', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  
  // JSON Formatter E2E
  await page.goto('/tools/json-formatter');
  await page.getByPlaceholder(/Type or paste your content/i).fill('{"name":"PanUtility"}');
  await page.getByRole('button', { name: /Verify & Format JSON/i }).click();
  await expect(page.locator('textarea').last()).toHaveValue(/{\n {2}"name": "PanUtility"\n}/);

  // Tip Calculator E2E
  await page.goto('/tools/tip-calc');
  await page.getByLabel(/Bill Amount/).fill('100');
  await page.getByRole('button', { name: /20% Tip/i }).click();
  await expect(page.getByText(/Tip Subtotal \(20%\):/i)).toBeVisible();

  // Dice Roller E2E
  await page.goto('/tools/dice-roller');
  await page.getByRole('button', { name: /Roll D6/i }).click();
  await expect(page.getByText(/Rolled D6:/i)).toBeVisible();

  assertNoErrors();
});

test('percentage calculator validates, computes, and resets', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  await page.goto('/tools/percent-calc');

  await page.getByRole('button', { name: /Calculate/i }).click();
  await expect(page.getByRole('alert')).toContainText('Percentage is required.');

  await page.getByLabel(/Percentage/).fill('25');
  await page.getByLabel(/Base value/).fill('200');
  await page.getByRole('button', { name: /Calculate/i }).click();
  await expect(page.getByText('25% of 200 = 50', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Reset/i }).click();
  await expect(page.getByText('25% of 200 = 50', { exact: true })).toHaveCount(0);
  assertNoErrors();
});

test('percentage calculator submits the form via the Enter key', async ({ page }) => {
  await page.goto('/tools/percent-calc');
  await page.getByLabel(/Percentage/).fill('12.5');
  await page.getByLabel(/Base value/).fill('80');
  await page.getByLabel(/Percentage/).press('Enter');
  await expect(page.getByText('12.5% of 80 = 10', { exact: true })).toBeVisible();
});

test('tip calculator computes split with a custom tip percentage', async ({ page }) => {
  await page.goto('/tools/tip-calc');
  await page.getByLabel(/Bill Amount/).fill('45.50');
  await page.getByLabel(/Number of People/).fill('3');
  await page.getByLabel(/Tip Percentage/).fill('15');
  await page.getByRole('button', { name: /Calculate Split/i }).click();
  await expect(page.getByText(/Tip Subtotal \(15%\): \$6\.83/)).toBeVisible();
  await expect(page.getByText(/Combined Total: \$52\.33/)).toBeVisible();
  await expect(page.getByText(/Individual Share \(3 people\): \$17\.44 per person/)).toBeVisible();
});

test('tip calculator rejects a fractional person count', async ({ page }) => {
  await page.goto('/tools/tip-calc');
  await page.getByLabel(/Bill Amount/).fill('50');
  await page.getByLabel(/Number of People/).fill('2.5');
  await page.getByRole('button', { name: /Calculate Split/i }).click();
  await expect(page.getByRole('alert')).toContainText('whole number');
});

test('dice roller rolls supported dice and resets', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  await page.goto('/tools/dice-roller');
  await page.getByRole('button', { name: /Roll D12/i }).click();
  await expect(page.getByText(/Rolled D12: \d+/)).toBeVisible();
  await page.getByRole('button', { name: /Reset Roll/i }).click();
  await expect(page.getByText(/Rolled D12:/)).toHaveCount(0);
  assertNoErrors();
});

test('rock paper scissors plays a round against a computer opponent', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  await page.goto('/tools/rock-paper-scissors');
  await page.getByRole('button', { name: 'rock' }).click();
  await expect(page.getByText(/Player: ROCK \| Computer: (ROCK|PAPER|SCISSORS)/)).toBeVisible();
  await expect(page.getByText(/Result: (YOU WIN!|YOU LOSE|DRAW!)/)).toBeVisible();
  await expect(page.getByText(/Score: \d/)).toBeVisible();
  assertNoErrors();
});

test('calculator and game tools render on a mobile viewport without console errors', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  await page.setViewportSize({ width: 375, height: 667 });
  for (const route of ['/tools/percent-calc', '/tools/tip-calc', '/tools/dice-roller', '/tools/rock-paper-scissors']) {
    await page.goto(route);
    await expect(page.locator('#root')).not.toBeEmpty();
  }
  assertNoErrors();
});

test('homepage and tool routes have no horizontal overflow at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const route of ['/', '/tools/percent-calc', '/tools/tip-calc', '/tools/dice-roller', '/tools/rock-paper-scissors']) {
    await page.goto(route);
    await expect(page.locator('#root')).not.toBeEmpty();
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(hasOverflow, `${route} overflows horizontally at 320px`).toBe(false);
  }
});

test('theme toggle changes and persists the selected theme', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle(/Switch to Minimalist Light Theme/i).click();
  await expect(page.locator('#all-in-one-app')).toHaveClass(/theme-light/);
  await page.reload();
  await expect(page.locator('#all-in-one-app')).toHaveClass(/theme-light/);
});

test('representative routes run under production CSP without violations', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);
  for (const route of ['/', '/tools/image-converter', '/tools/pdf-compiler', '/tools/audio-transcriber', '/tools/qr-generator', '/tools/social-downloader']) {
    const response = await page.goto(route);
    expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
    expect(response?.headers()['content-security-policy']).toContain("worker-src 'self' blob:");
    expect(response?.headers()['content-security-policy']).not.toMatch(/script-src[^;]*unsafe-inline|unsafe-eval/);
    await expect(page.locator('#root')).not.toBeEmpty();
  }
  assertNoErrors();
});

test('text functional tools complete core browser workflows without console errors', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);

  await page.goto('/tools/case-converter');
  await page.getByLabel('Source Text Input').fill('hello world test');
  await page.getByRole('button', { name: 'PascalCase' }).click();
  await expect(page.getByLabel('Processed Content Output')).toHaveValue('HelloWorldTest');
  await page.getByRole('button', { name: 'kebab-case' }).click();
  await expect(page.getByLabel('Processed Content Output')).toHaveValue('hello-world-test');

  await page.goto('/tools/word-counter');
  await page.getByLabel('Source Text Input').fill('One two three\n\nFour five six');
  await expect(page.getByLabel('Processed Content Output')).toHaveValue(/Words: 6/);
  await expect(page.getByLabel('Processed Content Output')).toHaveValue(/Paragraphs: 2/);

  await page.goto('/tools/lorem-ipsum');
  await page.getByLabel('Lorem ipsum paragraph count').fill('2');
  await page.getByRole('button', { name: /Generate Lorem Ipsum/i }).click();
  await expect(page.getByLabel('Processed Content Output')).toHaveValue(/Lorem ipsum/);

  await page.goto('/tools/line-remover');
  await page.getByLabel('Source Text Input').fill('  Alpha  \n\nalpha\n\nBeta');
  await page.getByRole('checkbox', { name: /Trim whitespace/i }).check();
  await page.getByRole('checkbox', { name: /Remove blank lines/i }).check();
  await page.getByRole('checkbox', { name: /Case-sensitive/i }).uncheck();
  await page.getByRole('button', { name: /Deduplicate Lines/i }).click();
  await expect(page.getByLabel('Processed Content Output')).toHaveValue('Alpha\nBeta');

  assertNoErrors();
});

test('image and PDF functional tools produce real downloadable data without CSP violations', async ({ page }) => {
  const assertNoErrors = failOnConsoleErrors(page);

  await page.goto('/tools/image-converter');
  await uploadGeneratedPngs(page, '#image-converter-file-input', [
    { name: 'red-green.png', left: '#ff0000', right: '#00ff00' },
  ]);
  await expect(page.getByText('red-green.png')).toBeVisible();
  await page.getByRole('button', { name: /Convert All Uploaded/i }).click();
  await expect(page.getByRole('button', { name: /Download red-green_converted\.webp/i })).toBeVisible({ timeout: 10_000 });
  const imageDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download red-green_converted\.webp/i }).click();
  const imageDownload = await imageDownloadPromise;
  const imagePath = await imageDownload.path();
  expect(imagePath).toBeTruthy();
  const imageBytes = readFileSync(imagePath!);
  expect(imageBytes.subarray(0, 4).toString('ascii')).toBe('RIFF');
  expect(imageBytes.subarray(8, 12).toString('ascii')).toBe('WEBP');

  await page.goto('/tools/color-extractor');
  await uploadGeneratedPngs(page, '#color-extractor-file-input', [
    { name: 'palette.png', left: '#ff0000', right: '#00ff00' },
  ]);
  await expect(page.getByText('#FF0000')).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('#00FF00')).toBeVisible();

  await page.goto('/tools/pdf-compiler');
  await uploadGeneratedPngs(page, '#pdf-compiler-file-input', [
    { name: 'page-one.png', left: '#ff0000', right: '#ff0000' },
    { name: 'page-two.png', left: '#00ff00', right: '#00ff00' },
  ]);
  await expect(page.getByText('Pages Layout (2 pages)')).toBeVisible();
  await page.getByRole('button', { name: /Compile into PDF/i }).click();
  await expect(page.getByRole('button', { name: /Download PDF Now/i })).toBeVisible({ timeout: 15_000 });
  const pdfDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /Download PDF Now/i }).click();
  const pdfDownload = await pdfDownloadPromise;
  const pdfPath = await pdfDownload.path();
  expect(pdfPath).toBeTruthy();
  const pdfBytes = readFileSync(pdfPath!);
  expect(pdfBytes.subarray(0, 4).toString('ascii')).toBe('%PDF');
  expect(pdfBytes.length).toBeGreaterThan(1_000);

  assertNoErrors();
});

test('raw HTTP HTML for hidden and unknown tool routes is noindex and not homepage metadata', async ({ request }) => {
  for (const route of ['/tools/gif-maker', '/tools/video-compressor', '/tools/social-downloader']) {
    const response = await request.get(route);
    expect(response.status(), `${route} should serve truthful hidden-route HTML`).toBe(200);
    const html = await response.text();
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).not.toContain('<title>PanUtility - Universal Media &amp; Format Workstation</title>');
    expect(html).not.toContain('<link rel="canonical" href="https://panutility.vercel.app/" />');
    expect(html).not.toContain('"@type":"WebSite"');
  }

  const unknown = await request.get('/tools/not-a-real-tool');
  expect(unknown.status()).toBe(404);
  const unknownHtml = await unknown.text();
  expect(unknownHtml).toContain('<meta name="robots" content="noindex, nofollow" />');
  expect(unknownHtml).toContain('<title>Page Not Found - PanUtility</title>');
  expect(unknownHtml).not.toContain('<link rel="canonical"');
  expect(unknownHtml).not.toContain('<title>PanUtility - Universal Media &amp; Format Workstation</title>');
});

test('production output applies cache policy and does not expose server artifacts', async ({ page, request }) => {
  const homepage = await request.get('/');
  expect(homepage.headers()['cache-control']).toContain('max-age=0');
  const html = await homepage.text();
  const assetPath = html.match(/(?:src|href)="(\/assets\/[^"]+)"/)?.[1];
  expect(assetPath).toBeTruthy();
  const asset = await request.get(assetPath!);
  expect(asset.ok()).toBe(true);
  expect(asset.headers()['cache-control']).toContain('immutable');
  expect((await request.get('/server.cjs.map')).status()).toBe(404);

  await page.goto('/tools/json-formatter');
  await expect(page.getByRole('heading', { name: 'JSON Beautifier & Validator' })).toBeVisible();
});
