import { describe, expect, it } from 'vitest';

// P2-A2 tool logic unit tests
// These test the pure functions that power slug-generator, text-sorter,
// uuid-generator, base-converter, and contrast-checker.

// --- Slug Generator ---

const generateSlug = (input: string): string => {
  if (!input) return '';
  return input
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
};

describe('P2-A2 slug-generator logic', () => {
  it('converts normal English to slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('removes punctuation', () => {
    expect(generateSlug('Hello, World!')).toBe('hello-world');
  });

  it('collapses repeated spaces', () => {
    expect(generateSlug('Hello   World')).toBe('hello-world');
  });

  it('handles accented text via diacritics stripping', () => {
    expect(generateSlug('Café Résumé')).toBe('cafe-resume');
  });

  it('handles emoji by stripping non-alphanumeric', () => {
    expect(generateSlug('Hello 🌍 World')).toBe('hello-world');
  });

  it('trims leading and trailing hyphens', () => {
    expect(generateSlug('-Hello-')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(generateSlug('')).toBe('');
  });

  it('handles pure numbers', () => {
    expect(generateSlug('123 456')).toBe('123-456');
  });
});

// --- Text Sorter ---

const sortLines = (input: string, mode: 'az' | 'za' | 'num-asc' | 'num-desc'): string => {
  if (!input) return '';
  const lines = input.split('\n');
  const collator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: mode.startsWith('num') });
  let sorted: string[];
  if (mode === 'az') {
    sorted = [...lines].sort((a, b) => collator.compare(a, b));
  } else if (mode === 'za') {
    sorted = [...lines].sort((a, b) => collator.compare(b, a));
  } else if (mode === 'num-asc') {
    sorted = [...lines].sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return collator.compare(a, b);
    });
  } else {
    sorted = [...lines].sort((a, b) => {
      const na = parseFloat(a), nb = parseFloat(b);
      if (!isNaN(na) && !isNaN(nb)) return nb - na;
      return collator.compare(b, a);
    });
  }
  return sorted.join('\n');
};

describe('P2-A2 text-sorter logic', () => {
  it('sorts alphabetically A→Z', () => {
    expect(sortLines('banana\napple\ncherry', 'az')).toBe('apple\nbanana\ncherry');
  });

  it('sorts alphabetically Z→A', () => {
    expect(sortLines('banana\napple\ncherry', 'za')).toBe('cherry\nbanana\napple');
  });

  it('sorts numerically ascending', () => {
    expect(sortLines('30\n10\n20', 'num-asc')).toBe('10\n20\n30');
  });

  it('sorts numerically descending', () => {
    expect(sortLines('30\n10\n20', 'num-desc')).toBe('30\n20\n10');
  });

  it('handles duplicates', () => {
    expect(sortLines('b\na\nb', 'az')).toBe('a\nb\nb');
  });

  it('handles Unicode text', () => {
    expect(sortLines('café\napple\nbanana', 'az')).toBe('apple\nbanana\ncafé');
  });

  it('returns empty string for empty input', () => {
    expect(sortLines('', 'az')).toBe('');
  });
});

// --- UUID Generator ---

const generateUUIDs = (count: number): string[] => {
  const uuids: string[] = [];
  for (let i = 0; i < count; i++) {
    uuids.push(crypto.randomUUID());
  }
  return uuids;
};

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('P2-A2 uuid-generator logic', () => {
  it('generates valid UUID v4 format', () => {
    const uuids = generateUUIDs(1);
    expect(uuids).toHaveLength(1);
    expect(uuids[0]).toMatch(UUID_V4_RE);
  });

  it('generates requested count', () => {
    const uuids = generateUUIDs(10);
    expect(uuids).toHaveLength(10);
  });

  it('generates unique UUIDs', () => {
    const uuids = generateUUIDs(50);
    const unique = new Set(uuids);
    expect(unique.size).toBe(50);
  });

  it('all entries match UUID v4 format', () => {
    const uuids = generateUUIDs(20);
    for (const uuid of uuids) {
      expect(uuid).toMatch(UUID_V4_RE);
    }
  });
});

// --- Base Converter ---

const convertBase = (input: string, fromBase: number, toBase: number): string => {
  if (!input.trim()) return '';
  try {
    const raw = input.trim();
    const prefixes: Record<number, string> = { 2: '0b', 8: '0o', 10: '', 16: '0x' };
    const fromPrefix = prefixes[fromBase] ?? '';
    const val = BigInt(fromPrefix + raw);
    const result = val.toString(toBase).toUpperCase();
    return (prefixes[toBase] ?? '') + result;
  } catch {
    return `Invalid input for base ${fromBase}.`;
  }
};

describe('P2-A2 base-converter logic', () => {
  it('converts 0 decimal to binary', () => {
    expect(convertBase('0', 10, 2)).toBe('0b0');
  });

  it('converts decimal to binary', () => {
    expect(convertBase('42', 10, 2)).toBe('0b101010');
  });

  it('converts decimal to hex', () => {
    expect(convertBase('255', 10, 16)).toBe('0xFF');
  });

  it('converts binary to decimal', () => {
    expect(convertBase('1010', 2, 10)).toBe('10');
  });

  it('converts hex to binary', () => {
    expect(convertBase('FF', 16, 2)).toBe('0b11111111');
  });

  it('handles large integers via BigInt', () => {
    expect(convertBase('9999999999999999', 10, 16)).toBe('0x2386F26FC0FFFF');
  });

  it('returns error for invalid digits', () => {
    const result = convertBase('G', 16, 10);
    expect(result).toContain('Invalid');
  });

  it('returns empty string for empty input', () => {
    expect(convertBase('', 10, 16)).toBe('');
  });
});

// --- Contrast Checker ---

const parseHex = (hex: string): [number, number, number] | null => {
  const match = hex.replace(/^#/, '').match(/^([0-9a-f]{3,8})$/i);
  if (!match) return null;
  let h = match[1];
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length !== 6) return null;
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const luminance = (r: number, g: number, b: number): number => {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

const contrastRatio = (fg: string, bg: string): number | null => {
  const fgRgb = parseHex(fg);
  const bgRgb = parseHex(bg);
  if (!fgRgb || !bgRgb) return null;
  const l1 = luminance(...fgRgb);
  const l2 = luminance(...bgRgb);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

describe('P2-A2 contrast-checker logic', () => {
  it('black on white = 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 0);
  });

  it('same color = 1:1', () => {
    expect(contrastRatio('#FF0000', '#FF0000')).toBeCloseTo(1, 1);
  });

  it('white on black = 21:1', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 0);
  });

  it('returns null for invalid hex', () => {
    expect(contrastRatio('invalid', '#000000')).toBeNull();
  });

  it('handles 3-char hex shorthand', () => {
    const ratio = contrastRatio('#000', '#FFF');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeCloseTo(21, 0);
  });

  it('AA normal text threshold (4.5:1)', () => {
    // #767676 on white is exactly 4.54:1 (passes AA normal)
    const ratio = contrastRatio('#767676', '#FFFFFF');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(4.5);
  });

  it('AAA normal text threshold (7:1)', () => {
    // #595959 on white is approximately 7:1
    const ratio = contrastRatio('#595959', '#FFFFFF');
    expect(ratio).not.toBeNull();
    expect(ratio!).toBeGreaterThanOrEqual(7);
  });
});
