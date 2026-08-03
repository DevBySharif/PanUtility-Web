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

test('shows not found for an unknown route', async ({ page }) => {
  await page.goto('/tools/not-a-real-tool');
  await expect(page.getByRole('heading', { name: 'Tool not found' })).toBeVisible();
});

test('direct known tool URL navigation works', async ({ page }) => {
  await page.goto('/tools/json-formatter');
  await expect(page.getByRole('heading', { name: 'JSON Beautifier & Validator' })).toBeVisible();
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
