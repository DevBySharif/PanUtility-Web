export type CaseMode = 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'pascal' | 'snake' | 'kebab';

function capitalizeWord(word: string): string {
  const [first, ...rest] = Array.from(word);
  return first.toUpperCase() + rest.join('').toLowerCase();
}

export function convertCase(value: string, mode: CaseMode): string {
  if (!value) return '';
  if (mode === 'upper') return value.toUpperCase();
  if (mode === 'lower') return value.toLowerCase();
  
  if (mode === 'title') {
    return value.replace(/(\p{L})([\p{L}\p{N}]*)/gu, (_, first: string, rest: string) => 
      first.toUpperCase() + rest.toLowerCase()
    );
  }
  
  if (mode === 'sentence') {
    return value.replace(/(^\s*|\b[.!?]\s+)(\p{L})/gu, (_, prefix: string, char: string) => 
      prefix + char.toUpperCase()
    );
  }

  const words = Array.from(value.matchAll(/\p{L}+|\p{N}+/gu), (m) => m[0]);
  if (words.length === 0) return value;

  if (mode === 'snake') {
    return words.map((w) => w.toLowerCase()).join('_');
  }

  if (mode === 'kebab') {
    return words.map((w) => w.toLowerCase()).join('-');
  }

  return words
    .map((word, index) =>
      index === 0 && mode === 'camel'
        ? word.toLowerCase()
        : capitalizeWord(word)
    )
    .join('');
}

export function countText(value: string) {
  if (!value) {
    return { words: 0, characters: 0, charactersWithoutSpaces: 0, lines: 0, paragraphs: 0, readingTimeMinutes: 0, readingTimeLabel: '0 min read' };
  }

  const wordMatches = value.match(/\p{L}+[\p{L}\p{N}']*\p{L}*|\p{N}+/gu);
  const words = wordMatches ? wordMatches.length : 0;
  
  // Use Array.from to count Unicode code points (properly counting emoji graphemes)
  const characters = Array.from(value).length;
  const charactersWithoutSpaces = Array.from(value.replace(/\s/g, '')).length;
  const lines = value.split(/\r?\n/).length;
  const paragraphs = countParagraphs(value);

  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));
  const readingTimeLabel = words === 0 ? '0 min read' : `${readingTimeMinutes} min read (est.)`;

  return {
    words,
    characters,
    charactersWithoutSpaces,
    lines,
    paragraphs,
    readingTimeMinutes,
    readingTimeLabel
  };
}

function countParagraphs(value: string): number {
  let paragraphs = 0;
  let inParagraph = false;
  for (const line of value.split(/\r?\n/)) {
    if (line.trim() === '') {
      inParagraph = false;
    } else if (!inParagraph) {
      paragraphs += 1;
      inParagraph = true;
    }
  }
  return paragraphs;
}

const LOREM_SENTENCES = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
  'Curabitur sed diam id nisi interdum faucibus, tempor nec purus.',
  'Vivamus sit amet lectus at eros accumsan sodales.',
  'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.',
  'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'
];

export function generateLorem(paragraphs: number): string {
  const count = Math.min(20, Math.max(1, Math.trunc(Number(paragraphs) || 1)));
  const result: string[] = [];

  for (let p = 0; p < count; p++) {
    const sentenceCount = 3 + (p % 3);
    const paragraphSentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      const idx = (p * 3 + s) % LOREM_SENTENCES.length;
      paragraphSentences.push(LOREM_SENTENCES[idx]);
    }
    result.push(paragraphSentences.join(' '));
  }

  return result.join('\n\n');
}

export interface RemoveDuplicatesOptions {
  trim?: boolean;
  removeEmpty?: boolean;
  caseSensitive?: boolean;
}

export function removeDuplicateLines(value: string, options: RemoveDuplicatesOptions = {}): string {
  const { trim = false, removeEmpty = false, caseSensitive = true } = options;
  if (!value) return '';

  const rawLines = value.split(/\r?\n/);
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawLine of rawLines) {
    const processedLine = trim ? rawLine.trim() : rawLine;
    if (removeEmpty && !processedLine) continue;

    const key = caseSensitive ? processedLine : processedLine.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(processedLine);
    }
  }

  return result.join('\n');
}

export function formatJson(value: string, mode: 'format' | 'minify' = 'format'): string {
  if (!value || !value.trim()) {
    throw new Error('Please enter valid JSON text to format.');
  }

  if (value.length > 5000000) {
    throw new Error('JSON input exceeds 5MB safety limit.');
  }

  try {
    const parsed = JSON.parse(value);
    return mode === 'minify' ? JSON.stringify(parsed) : JSON.stringify(parsed, null, 2);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid JSON format.';
    throw new Error(`JSON Syntax Error: ${msg}`);
  }
}

export function percentageOf(percent: number, value: number): number {
  if (!Number.isFinite(percent) || !Number.isFinite(value)) {
    throw new Error('Percent and value must be valid finite numbers.');
  }
  const raw = (percent / 100) * value;
  return Math.round(raw * 1e6) / 1e6;
}

export function splitTip(bill: number, tipPercent: number, people: number) {
  if (![bill, tipPercent, people].every(Number.isFinite)) {
    throw new Error('Enter valid finite numeric values.');
  }
  if (bill < 0) {
    throw new Error('Bill amount cannot be negative.');
  }
  if (tipPercent < 0) {
    throw new Error('Tip percentage cannot be negative.');
  }
  if (people <= 0 || !Number.isInteger(people)) {
    throw new Error('Number of people must be a positive whole integer (at least 1).');
  }

  const tip = Math.round((bill * tipPercent / 100) * 100) / 100;
  const total = Math.round((bill + tip) * 100) / 100;
  const perPerson = Math.round((total / people) * 100) / 100;

  return { tip, total, perPerson };
}

/**
 * Returns a uniformly distributed number in [0, 1) from Web Crypto when
 * available. When Web Crypto is unavailable (older embedded webviews), it
 * falls back to Math.random — an isolated, entertainment-only fallback that is
 * fine for dice/RPS play but must never be claimed as cryptographically secure.
 */
export function secureRandom(): number {
  const cryptoObj =
    (typeof window !== 'undefined' && window.crypto) ||
    (typeof globalThis !== 'undefined' && (globalThis as { crypto?: { getRandomValues: (array: Uint32Array) => void } }).crypto) ||
    undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const array = new Uint32Array(1);
    cryptoObj.getRandomValues(array);
    return array[0] / (0xFFFFFFFF + 1);
  }
  return Math.random();
}

const UINT32_MAX = 0xFFFFFFFF;

function secureUint32(random: () => number): number {
  const r = typeof random === 'function' ? random() : Math.random();
  return Math.min(Math.floor(r * (UINT32_MAX + 1)), UINT32_MAX);
}

/**
 * Uniform integer in [0, maxExclusive) using rejection sampling over the full
 * uint32 range, which removes the modulo bias of a naive `value % max`
 * mapping. The `random` source is injectable so tests stay deterministic.
 */
export function secureIntInRange(maxExclusive: number, random = secureRandom): number {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
    throw new Error('Upper bound must be a positive integer.');
  }
  const maxAllowed = Math.floor((UINT32_MAX + 1) / maxExclusive) * maxExclusive;
  let u = secureUint32(random);
  let guard = 0;
  while (u >= maxAllowed && guard < 1000) {
    u = secureUint32(random);
    guard += 1;
  }
  return u % maxExclusive;
}

export function rollDie(sides: number, random = secureRandom): number {
  if (!Number.isInteger(sides) || sides < 2) {
    throw new Error('Die sides must be a positive integer of at least 2.');
  }
  return secureIntInRange(sides, random) + 1;
}

export function playRockPaperScissors(player: 'rock' | 'paper' | 'scissors', random = secureRandom) {
  const choices = ['rock', 'paper', 'scissors'] as const;
  if (!choices.includes(player)) {
    throw new Error('Player choice must be "rock", "paper", or "scissors".');
  }
  const computer = choices[secureIntInRange(choices.length, random)];
  const result = player === computer 
    ? 'draw' 
    : (player === 'rock' && computer === 'scissors') || 
      (player === 'paper' && computer === 'rock') || 
      (player === 'scissors' && computer === 'paper') 
      ? 'win' 
      : 'lose';
  return { player, computer, result };
}

/**
 * Shared numeric standards for calculator-style tools.
 * - Rejects blank/whitespace input (blank is never treated as 0).
 * - Rejects NaN and non-finite values (no Infinity/-Infinity).
 * - Optional min/max/integer constraints with explicit error messages.
 * - Throws so callers can surface a precise validation message.
 */
export interface NumericConstraints {
  min?: number;
  max?: number;
  integer?: boolean;
}

export function parseFiniteNumber(value: string, label: string, constraints: NumericConstraints = {}): number {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(`${label} is required.`);
  }
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid finite number.`);
  }
  if (constraints.integer && !Number.isInteger(parsed)) {
    throw new Error(`${label} must be a whole number.`);
  }
  if (constraints.min !== undefined && parsed < constraints.min) {
    throw new Error(`${label} must be at least ${constraints.min}.`);
  }
  if (constraints.max !== undefined && parsed > constraints.max) {
    throw new Error(`${label} must be no more than ${constraints.max}.`);
  }
  return parsed;
}

/**
 * Display formatter that strips trailing zeros while keeping up to 6 decimals
 * (the rounding precision used by percentageOf). e.g. 50 -> "50", 10.5 -> "10.5".
 */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  const asString = value.toString();
  if (!asString.includes('.')) return asString;
  return asString.replace(/0+$/, '').replace(/\.$/, '');
}

export function decodeUrlSafely(value: string): { value?: string; error?: string } {
  try { return { value: decodeURIComponent(value) }; }
  catch { return { error: 'Invalid URL-encoded input.' }; }
}

export function decodeBase64Safely(value: string): { value?: string; error?: string } {
  try { return { value: decodeURIComponent(Array.from(atob(value), (character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')) }; }
  catch { return { error: 'Invalid Base64 input.' }; }
}

