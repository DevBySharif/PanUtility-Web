import { expect, test, type Page } from '@playwright/test';

function failOnConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  return () => expect(errors, `browser console errors: ${errors.join('\n')}`).toEqual([]);
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
  await page.goto('/tools/not-a-real-tool');
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
  await page.getByRole('button', { name: /20% Tip/i }).click();
  await expect(page.getByText(/Tip Subtotal \(20%\):/i)).toBeVisible();

  // Dice Roller E2E
  await page.goto('/tools/dice-roller');
  await page.getByRole('button', { name: /Roll D6/i }).click();
  await expect(page.getByText(/Rolled D6:/i)).toBeVisible();

  assertNoErrors();
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
  for (const route of ['/', '/tools/image-converter', '/tools/pdf-compiler', '/tools/audio-transcriber', '/tools/qr-generator', '/tools/social-downloader', '/tools/not-a-real-tool']) {
    const response = await page.goto(route);
    expect(response?.headers()['content-security-policy']).toContain("script-src 'self'");
    expect(response?.headers()['content-security-policy']).not.toMatch(/script-src[^;]*unsafe-inline|unsafe-eval/);
    await expect(page.locator('#root')).not.toBeEmpty();
  }
  assertNoErrors();
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
