import { describe, expect, it } from 'vitest';
import {
  buildConvertedFileName,
  computeDrawRect,
  computeOutputDimensions,
  computePageDimensions,
  extractDominantColors,
  formatFileSize,
  formatSizeDelta,
  isFullyTransparent,
  sanitizePdfTitle,
  validateImageFile,
} from '../src/lib/imageTools';

describe('image-tools validateImageFile', () => {
  it('rejects a 0 byte file as empty', () => {
    const result = validateImageFile({ name: 'a.png', size: 0, type: 'image/png' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('empty');
      expect(result.message).toContain('0 bytes');
    }
  });

  it('rejects files above the 50MB safety limit', () => {
    const result = validateImageFile({ name: 'big.png', size: 50 * 1024 * 1024 + 1, type: 'image/png' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('too-large');
      expect(result.message).toContain('50MB');
    }
  });

  it('accepts a file exactly at the 50MB limit', () => {
    expect(validateImageFile({ name: 'big.png', size: 50 * 1024 * 1024, type: 'image/png' }).ok).toBe(true);
  });

  it('rejects files with neither an image MIME type nor an image extension', () => {
    const result = validateImageFile({ name: 'notes.txt', size: 10, type: 'text/plain' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('unsupported');
  });

  it('accepts an image by MIME type even without an extension', () => {
    expect(validateImageFile({ name: 'screenshot', size: 10, type: 'image/jpeg' }).ok).toBe(true);
  });

  it('accepts an image by extension even when the MIME type is empty', () => {
    expect(validateImageFile({ name: 'photo.webp', size: 10, type: '' }).ok).toBe(true);
    expect(validateImageFile({ name: 'photo.JPG', size: 10, type: '' }).ok).toBe(true);
  });

  it('rejects a file whose extension is not a supported image format', () => {
    expect(validateImageFile({ name: 'archive.zip', size: 10, type: '' }).ok).toBe(false);
  });
});

describe('image-tools buildConvertedFileName', () => {
  it('replaces the original extension with the converted one', () => {
    expect(buildConvertedFileName('photo.jpg', 'image/jpeg')).toBe('photo_converted.jpeg');
    expect(buildConvertedFileName('photo.png', 'image/webp')).toBe('photo_converted.webp');
  });

  it('handles multiple dots by keeping everything before the final extension', () => {
    expect(buildConvertedFileName('my.image.photo.PNG', 'image/png')).toBe('my_image_photo_converted.png');
  });

  it('falls back to the whole name when there is no extension', () => {
    expect(buildConvertedFileName('noext', 'image/webp')).toBe('noext_converted.webp');
  });

  it('sanitizes unsafe characters from the base name', () => {
    expect(buildConvertedFileName('héllo wörld.jpg', 'image/jpeg')).toBe('h_llo_w_rld_converted.jpeg');
  });
});

describe('image-tools formatFileSize', () => {
  it('formats zero, negative, and non-finite sizes as 0 B', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(-5)).toBe('0 B');
    expect(formatFileSize(Number.NaN)).toBe('0 B');
    expect(formatFileSize(Number.POSITIVE_INFINITY)).toBe('0 B');
  });

  it('formats byte, KB, MB, and GB magnitudes', () => {
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe('1.5 GB');
  });
});

describe('image-tools formatSizeDelta', () => {
  it('reports positive, negative, and zero size changes as percentages', () => {
    expect(formatSizeDelta(100, 150)).toBe('50%');
    expect(formatSizeDelta(100, 50)).toBe('-50%');
    expect(formatSizeDelta(100, 100)).toBe('0%');
  });

  it('guards against a zero or non-finite original size', () => {
    expect(formatSizeDelta(0, 100)).toBe('0%');
    expect(formatSizeDelta(Number.NaN, 100)).toBe('0%');
  });
});

describe('image-tools computeOutputDimensions', () => {
  it('preserves original dimensions when no resize is requested', () => {
    expect(computeOutputDimensions(800, 600, '', '', true)).toEqual({ width: 800, height: 600 });
  });

  it('scales height proportionally when only width is set and aspect is locked', () => {
    expect(computeOutputDimensions(800, 600, '400', '', true)).toEqual({ width: 400, height: 300 });
    expect(computeOutputDimensions(600, 800, '300', '', true)).toEqual({ width: 300, height: 400 });
  });

  it('scales width proportionally when only height is set and aspect is locked', () => {
    expect(computeOutputDimensions(800, 600, '', '300', true)).toEqual({ width: 400, height: 300 });
  });

  it('uses both values verbatim when both are provided', () => {
    expect(computeOutputDimensions(800, 600, '100', '50', true)).toEqual({ width: 100, height: 50 });
  });

  it('distorts the image when both are provided and aspect lock is off', () => {
    expect(computeOutputDimensions(800, 600, '100', '200', false)).toEqual({ width: 100, height: 200 });
  });

  it('treats invalid width/height values as absent', () => {
    expect(computeOutputDimensions(800, 600, '0', '', true)).toEqual({ width: 800, height: 600 });
    expect(computeOutputDimensions(800, 600, '-5', '', true)).toEqual({ width: 800, height: 600 });
    expect(computeOutputDimensions(800, 600, 'abc', '', true)).toEqual({ width: 800, height: 600 });
    expect(computeOutputDimensions(800, 600, '', '0', true)).toEqual({ width: 800, height: 600 });
  });

  it('clamps absurd dimensions above the canvas safety limit', () => {
    expect(computeOutputDimensions(800, 600, '20000', '', true)).toEqual({ width: 800, height: 600 });
    expect(computeOutputDimensions(800, 600, '16384', '', true)).toEqual({ width: 16384, height: 12288 });
  });
});

describe('image-tools extractDominantColors', () => {
  it('returns an empty palette for empty input', () => {
    expect(extractDominantColors([])).toEqual([]);
  });

  it('returns a single 100% swatch for a solid color image', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
      255, 0, 0, 255,
    ]);
    const palette = extractDominantColors(data, { clusterFactor: 32, topCount: 6 });
    expect(palette).toHaveLength(1);
    expect(palette[0].hex).toBe('#ff0000');
    expect(palette[0].rgb).toBe('rgb(255, 0, 0)');
    expect(palette[0].percentage).toBe(100);
  });

  it('splits a two-tone image into two proportional swatches', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 255, 0, 255,
    ]);
    const palette = extractDominantColors(data, { clusterFactor: 32, topCount: 6 });
    expect(palette).toHaveLength(2);
    expect(palette[0].hex).toBe('#ff0000');
    expect(palette[0].percentage).toBe(50);
    expect(palette[1].hex).toBe('#00ff00');
    expect(palette[1].percentage).toBe(50);
  });

  it('skips fully transparent pixels and does not count them in percentages', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ]);
    const palette = extractDominantColors(data, { clusterFactor: 32, topCount: 6 });
    expect(palette).toHaveLength(1);
    expect(palette[0].percentage).toBe(100);
  });

  it('returns an empty palette when every pixel is transparent', () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
      0, 0, 0, 0,
    ]);
    expect(extractDominantColors(data)).toEqual([]);
  });

  it('clusters near-identical shades into the same bucket', () => {
    const data = new Uint8ClampedArray([
      245, 0, 0, 255,
      255, 0, 0, 255,
      0, 0, 255, 255,
    ]);
    const palette = extractDominantColors(data, { clusterFactor: 32, topCount: 6 });
    expect(palette).toHaveLength(2);
    expect(palette[0].hex).toBe('#ff0000');
    expect(palette[0].percentage).toBe(67);
    expect(palette[1].hex).toBe('#0000ff');
    expect(palette[1].percentage).toBe(33);
  });

  it('limits the palette to the requested top count', () => {
    const data = new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
      0, 0, 255, 255,
      255, 255, 0, 255,
      255, 0, 255, 255,
      0, 255, 255, 255,
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);
    expect(extractDominantColors(data, { clusterFactor: 32, topCount: 3 })).toHaveLength(3);
  });
});

describe('image-tools isFullyTransparent', () => {
  it('treats empty data as fully transparent', () => {
    expect(isFullyTransparent([])).toBe(true);
  });

  it('detects an image where all alpha channels are below the threshold', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 127, 40, 50, 60, 0]);
    expect(isFullyTransparent(data)).toBe(true);
  });

  it('returns false when at least one pixel is opaque enough', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 127, 40, 50, 60, 255]);
    expect(isFullyTransparent(data)).toBe(false);
  });
});

describe('image-tools computePageDimensions', () => {
  it('returns A4 portrait for a portrait image with auto orientation', () => {
    expect(computePageDimensions(600, 800, 'a4', 'auto')).toEqual({ pageW: 595, pageH: 842 });
  });

  it('swaps A4 to landscape for a landscape image with auto orientation', () => {
    expect(computePageDimensions(800, 600, 'a4', 'auto')).toEqual({ pageW: 842, pageH: 595 });
  });

  it('honours an explicit portrait or landscape orientation', () => {
    expect(computePageDimensions(800, 600, 'a4', 'portrait')).toEqual({ pageW: 595, pageH: 842 });
    expect(computePageDimensions(600, 800, 'a4', 'landscape')).toEqual({ pageW: 842, pageH: 595 });
  });

  it('returns letter dimensions for the letter preset', () => {
    expect(computePageDimensions(600, 800, 'letter', 'auto')).toEqual({ pageW: 612, pageH: 792 });
    expect(computePageDimensions(800, 600, 'letter', 'auto')).toEqual({ pageW: 792, pageH: 612 });
  });

  it('preserves original dimensions and ignores orientation for original page size', () => {
    expect(computePageDimensions(800, 600, 'original', 'portrait')).toEqual({ pageW: 800, pageH: 600 });
    expect(computePageDimensions(120, 60, 'original', 'landscape')).toEqual({ pageW: 120, pageH: 60 });
  });
});

describe('image-tools computeDrawRect', () => {
  it('fits a landscape image into a landscape page, centered, without margins', () => {
    const rect = computeDrawRect(800, 600, 842, 595, 0);
    expect(rect.width).toBeCloseTo(793.33, 1);
    expect(rect.height).toBeCloseTo(595, 1);
    expect(rect.x).toBeCloseTo((842 - rect.width) / 2, 1);
    expect(rect.y).toBe(0);
  });

  it('shrinks the drawable area by margins and centers inside it', () => {
    const rect = computeDrawRect(800, 600, 842, 595, 30);
    expect(rect.width).toBeLessThan(842);
    expect(rect.width).toBeCloseTo(713.33, 1);
    expect(rect.height).toBe(535);
    expect(rect.x).toBeGreaterThan(30);
    expect(rect.y).toBe(30);
  });

  it('fits a portrait image into a portrait page while preserving aspect ratio', () => {
    const rect = computeDrawRect(600, 800, 595, 842, 0);
    expect(rect.width / rect.height).toBeCloseTo(600 / 800, 3);
    expect(rect.width).toBeLessThanOrEqual(595);
    expect(rect.height).toBeLessThanOrEqual(842);
  });

  it('never produces negative or zero dimensions even for a tiny page with large margins', () => {
    const rect = computeDrawRect(5, 5, 1, 1, 30);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
    expect(Number.isFinite(rect.x)).toBe(true);
    expect(Number.isFinite(rect.y)).toBe(true);
  });
});

describe('image-tools sanitizePdfTitle', () => {
  it('falls back to a default title for empty or whitespace-only input', () => {
    expect(sanitizePdfTitle('')).toBe('compiled_document');
    expect(sanitizePdfTitle('   ')).toBe('compiled_document');
  });

  it('preserves a clean title verbatim', () => {
    expect(sanitizePdfTitle('my report')).toBe('my report');
  });

  it('strips characters that are unsafe in file names', () => {
    expect(sanitizePdfTitle('a/b\\c:d.pdf')).toBe('abcdpdf');
  });

  it('returns the fallback when every character is stripped', () => {
    expect(sanitizePdfTitle('#$%')).toBe('compiled_document');
  });

  it('caps overly long titles to 80 characters', () => {
    expect(sanitizePdfTitle('x'.repeat(200))).toHaveLength(80);
  });
});
