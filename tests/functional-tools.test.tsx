import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import ColorExtractor from '../src/components/ColorExtractor';
import ImageConverter from '../src/components/ImageConverter';
import PdfCompiler from '../src/components/PdfCompiler';
import { ToastProvider } from '../src/components/Toast';
import {
  convertCase,
  countText,
  formatJson,
  generateLorem,
  percentageOf,
  playRockPaperScissors,
  removeDuplicateLines,
  rollDie,
  secureRandom,
  splitTip
} from '../src/lib/toolTransforms';

const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);

describe('P1-B Functional Tools Comprehensive Test Suite', () => {

  // --- 1. IMAGE CONVERTER ---
  describe('image-converter', () => {
    it('renders the workspace with file dropzone and controls', () => {
      renderTool(<ImageConverter onBack={() => undefined} />);
      expect(screen.getByText(/Image Format Converter/i)).toBeInTheDocument();
      expect(screen.getByText(/Conversion Settings/i)).toBeInTheDocument();
    });

    it('exposes a keyboard-accessible, labelled dropzone', () => {
      renderTool(<ImageConverter onBack={() => undefined} />);
      const dropzone = screen.getByRole('button', { name: /Upload images to convert/i });
      expect(dropzone).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('button', { name: /Convert All Uploaded/i })).toBeDisabled();
    });

    it('rejects a non-image file selection with a validation toast', () => {
      renderTool(<ImageConverter onBack={() => undefined} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const invalidFile = new File(['plain text'], 'notes.txt', { type: 'text/plain' });
      fireEvent.change(input, { target: { files: [invalidFile] } });
      expect(screen.getByText('Unsupported Format')).toBeInTheDocument();
      expect(screen.queryByText(/Queue/i)).not.toBeInTheDocument();
    });

    it('rejects an empty file selection with a validation toast', () => {
      renderTool(<ImageConverter onBack={() => undefined} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const emptyFile = new File([], 'blank.png', { type: 'image/png' });
      fireEvent.change(input, { target: { files: [emptyFile] } });
      expect(screen.getByText('Empty File Skipped')).toBeInTheDocument();
    });
  });

  // --- 2. COLOR EXTRACTOR ---
  describe('color-extractor', () => {
    it('renders the color extraction workspace', () => {
      renderTool(<ColorExtractor onBack={() => undefined} />);
      expect(screen.getByText(/Color Palette Extractor/i)).toBeInTheDocument();
      expect(screen.getByText(/Drag & drop your image/i)).toBeInTheDocument();
    });

    it('exposes a keyboard-accessible, labelled dropzone', () => {
      renderTool(<ColorExtractor onBack={() => undefined} />);
      const dropzone = screen.getByRole('button', { name: /Upload an image to extract colors/i });
      expect(dropzone).toHaveAttribute('tabindex', '0');
    });

    it('validates a file dropped onto the dropzone', () => {
      renderTool(<ColorExtractor onBack={() => undefined} />);
      const dropzone = screen.getByRole('button', { name: /Upload an image to extract colors/i });
      const invalidFile = new File(['plain text'], 'notes.txt', { type: 'text/plain' });
      fireEvent.drop(dropzone, { dataTransfer: { files: [invalidFile] } });
      expect(screen.getByText('Invalid Image')).toBeInTheDocument();
    });

    it('rejects an oversized file selection with a validation toast', () => {
      renderTool(<ColorExtractor onBack={() => undefined} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const hugeFile = new File([new Uint8Array(51 * 1024 * 1024)], 'huge.png', { type: 'image/png' });
      fireEvent.change(input, { target: { files: [hugeFile] } });
      expect(screen.getByText('File Too Large')).toBeInTheDocument();
    });
  });

  // --- 3. PDF COMPILER ---
  describe('pdf-compiler', () => {
    it('renders the PDF compiler workspace', () => {
      renderTool(<PdfCompiler onBack={() => undefined} />);
      expect(screen.getByText(/PDF Compiler/i)).toBeInTheDocument();
      expect(screen.getByText(/PDF Configuration/i)).toBeInTheDocument();
    });

    it('exposes a keyboard-accessible, labelled dropzone', () => {
      renderTool(<PdfCompiler onBack={() => undefined} />);
      const dropzone = screen.getByRole('button', { name: /Upload images to compile into a PDF/i });
      expect(dropzone).toHaveAttribute('tabindex', '0');
      expect(screen.getByRole('button', { name: /Compile into PDF/i })).toBeDisabled();
    });

    it('rejects a non-image file selection with a validation toast', () => {
      renderTool(<PdfCompiler onBack={() => undefined} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const invalidFile = new File(['plain text'], 'notes.txt', { type: 'text/plain' });
      fireEvent.change(input, { target: { files: [invalidFile] } });
      expect(screen.getByText('Unsupported Format')).toBeInTheDocument();
      expect(screen.queryByText(/Pages Layout/i)).not.toBeInTheDocument();
    });
  });

  // --- 4. CASE CONVERTER ---
  describe('case-converter (convertCase)', () => {
    it('handles empty input gracefully', () => {
      expect(convertCase('', 'upper')).toBe('');
      expect(convertCase('', 'title')).toBe('');
    });

    it('transforms text to UPPERCASE and lowercase', () => {
      expect(convertCase('hello world', 'upper')).toBe('HELLO WORLD');
      expect(convertCase('HELLO WORLD', 'lower')).toBe('hello world');
    });

    it('transforms text to Title Case preserving Unicode accents', () => {
      expect(convertCase('hello world', 'title')).toBe('Hello World');
      expect(convertCase('café au lait', 'title')).toBe('Café Au Lait');
    });

    it('transforms text to Sentence case', () => {
      expect(convertCase('hello world. second sentence.', 'sentence')).toBe('Hello world. Second sentence.');
    });

    it('transforms text to camelCase and snake_case', () => {
      expect(convertCase('hello world test', 'camel')).toBe('helloWorldTest');
      expect(convertCase('hello world test', 'snake')).toBe('hello_world_test');
    });

    it('transforms text to PascalCase and kebab-case', () => {
      expect(convertCase('hello world test', 'pascal')).toBe('HelloWorldTest');
      expect(convertCase('hello world test', 'kebab')).toBe('hello-world-test');
      expect(convertCase('hello, world!', 'pascal')).toBe('HelloWorld');
      expect(convertCase('hello, world!', 'kebab')).toBe('hello-world');
    });

    it('handles emoji without corrupting preserved modes', () => {
      expect(convertCase('🎉 hello 🎉', 'upper')).toBe('🎉 HELLO 🎉');
      expect(convertCase('🎉 hello 🎉', 'lower')).toBe('🎉 hello 🎉');
      expect(convertCase('🎉 hello 🎉', 'title')).toBe('🎉 Hello 🎉');
    });

    it('drops emoji for identifier-style cases', () => {
      expect(convertCase('hello 🎉 world', 'camel')).toBe('helloWorld');
      expect(convertCase('hello 🎉 world', 'pascal')).toBe('HelloWorld');
      expect(convertCase('hello 🎉 world', 'snake')).toBe('hello_world');
      expect(convertCase('hello 🎉 world', 'kebab')).toBe('hello-world');
    });

    it('handles mixed scripts and Unicode accents across all modes', () => {
      expect(convertCase('héllo wörld', 'upper')).toBe('HÉLLO WÖRLD');
      expect(convertCase('HÉLLO WÖRLD', 'lower')).toBe('héllo wörld');
      expect(convertCase('héllo wörld', 'title')).toBe('Héllo Wörld');
      expect(convertCase('héllo wörld', 'camel')).toBe('hélloWörld');
      expect(convertCase('héllo wörld', 'pascal')).toBe('HélloWörld');
      expect(convertCase('héllo wörld', 'snake')).toBe('héllo_wörld');
      expect(convertCase('héllo wörld', 'kebab')).toBe('héllo-wörld');
      expect(convertCase('你好 世界', 'camel')).toBe('你好世界');
      expect(convertCase('你好 世界', 'snake')).toBe('你好_世界');
    });

    it('returns empty string for empty input across all modes', () => {
      const modes = ['upper', 'lower', 'title', 'sentence', 'camel', 'pascal', 'snake', 'kebab'] as const;
      for (const mode of modes) {
        expect(convertCase('', mode)).toBe('');
      }
    });

    it('preserves punctuation-only input unchanged for word-based modes', () => {
      expect(convertCase('!!!', 'camel')).toBe('!!!');
      expect(convertCase('!!!', 'snake')).toBe('!!!');
      expect(convertCase('!!!', 'pascal')).toBe('!!!');
    });
  });

  // --- 5. WORD COUNTER ---
  describe('word-counter (countText)', () => {
    it('returns zero counts for empty text', () => {
      const res = countText('');
      expect(res.words).toBe(0);
      expect(res.characters).toBe(0);
      expect(res.lines).toBe(0);
    });

    it('counts words, characters, and lines correctly', () => {
      const res = countText('One two three\nFour five');
      expect(res.words).toBe(5);
      expect(res.characters).toBe(23);
      expect(res.lines).toBe(2);
    });

    it('handles Unicode code points and emoji graphemes accurately', () => {
      const res = countText('Hello 👋 world 🌍');
      expect(res.words).toBe(2);
      expect(res.characters).toBe(15);
    });

    it('provides estimated reading time label', () => {
      const res = countText('word '.repeat(250));
      expect(res.readingTimeMinutes).toBe(2);
      expect(res.readingTimeLabel).toContain('2 min read');
    });

    it('counts punctuation-only input as zero words', () => {
      const res = countText('!!! ... ??? ---');
      expect(res.words).toBe(0);
      expect(res.readingTimeLabel).toBe('0 min read');
    });

    it('counts whitespace-only input as zero words and zero paragraphs', () => {
      const res = countText('   \n  \n   ');
      expect(res.words).toBe(0);
      expect(res.lines).toBe(3);
      expect(res.paragraphs).toBe(0);
      expect(res.charactersWithoutSpaces).toBe(0);
    });

    it('counts paragraphs as non-empty blocks separated by blank lines', () => {
      expect(countText('a\nb\n\nc').paragraphs).toBe(2);
      expect(countText('a\nb').paragraphs).toBe(1);
      expect(countText('a\n\n\nb\nc').paragraphs).toBe(2);
      expect(countText('\n\na\n\n').paragraphs).toBe(1);
      expect(countText('').paragraphs).toBe(0);
    });

    it('counts CJK script runs as words', () => {
      const res = countText('你好世界 中文');
      expect(res.words).toBe(2);
      expect(res.characters).toBe(7);
    });

    it('counts emoji-only input as zero words', () => {
      const res = countText('🎉🎉🎉');
      expect(res.words).toBe(0);
      expect(res.characters).toBe(3);
    });

    it('handles large bounded inputs without error', () => {
      const res = countText(Array.from({ length: 10000 }, (_, i) => `word${i}`).join(' '));
      expect(res.words).toBe(10000);
      expect(res.readingTimeMinutes).toBe(50);
      expect(res.readingTimeLabel).toContain('50 min read (est.)');
    });
  });

  // --- 6. LOREM IPSUM ---
  describe('lorem-ipsum (generateLorem)', () => {
    it('clamps paragraph count between 1 and 20', () => {
      expect(generateLorem(0).split('\n\n')).toHaveLength(1);
      expect(generateLorem(2).split('\n\n')).toHaveLength(2);
      expect(generateLorem(50).split('\n\n')).toHaveLength(20);
    });

    it('generates non-empty varied paragraph sentences', () => {
      const paragraphs = generateLorem(3).split('\n\n');
      expect(paragraphs[0]).toContain('Lorem ipsum');
      expect(paragraphs[1]).not.toBe(paragraphs[0]);
    });

    it('is deterministic for the same input', () => {
      expect(generateLorem(3)).toBe(generateLorem(3));
      expect(generateLorem(5)).toBe(generateLorem(5));
      expect(generateLorem(1)).toBe(generateLorem(1));
      expect(generateLorem(20)).toBe(generateLorem(20));
    });

    it('clamps min/max and non-numeric inputs to the 1..20 bound', () => {
      expect(generateLorem(-5).split('\n\n')).toHaveLength(1);
      expect(generateLorem(0).split('\n\n')).toHaveLength(1);
      expect(generateLorem(0.5).split('\n\n')).toHaveLength(1);
      expect(generateLorem(NaN).split('\n\n')).toHaveLength(1);
      expect(generateLorem(21).split('\n\n')).toHaveLength(20);
      expect(generateLorem(1000).split('\n\n')).toHaveLength(20);
    });

    it('separates paragraphs with exactly a blank line and no trailing newline', () => {
      const output = generateLorem(4);
      expect(output).toMatch(/^[^\n]+\n\n[^\n]+/);
      expect(output.endsWith('\n\n')).toBe(false);
      expect(output.split('\n\n')).toHaveLength(4);
      for (const paragraph of output.split('\n\n')) {
        expect(paragraph.trim()).toBe(paragraph);
        expect(paragraph).not.toBe('');
        expect(paragraph.split('. ').length).toBeGreaterThanOrEqual(2);
      }
    });

    it('produces a stable, self-contained string suitable for copy', () => {
      const output = generateLorem(2);
      expect(typeof output).toBe('string');
      expect(output.length).toBeGreaterThan(100);
      expect(output).toContain('Lorem ipsum');
    });
  });

  // --- 7. LINE REMOVER ---
  describe('line-remover (removeDuplicateLines)', () => {
    it('handles empty input', () => {
      expect(removeDuplicateLines('')).toBe('');
    });

    it('deduplicates lines while preserving first occurrence order', () => {
      const input = 'alpha\nbeta\nalpha\ngamma\nbeta';
      expect(removeDuplicateLines(input)).toBe('alpha\nbeta\ngamma');
    });

    it('supports custom options (trim, removeEmpty, caseSensitive)', () => {
      const input = '  Alpha  \nalpha\n\nBeta';
      expect(removeDuplicateLines(input, { trim: true, removeEmpty: true, caseSensitive: false })).toBe('Alpha\nBeta');
      expect(removeDuplicateLines(input, { trim: false, removeEmpty: false, caseSensitive: true })).toBe('  Alpha  \nalpha\n\nBeta');
    });

    it('does not trim or drop blank lines by default', () => {
      const input = '  alpha  \n\n  alpha  \n\nbeta';
      expect(removeDuplicateLines(input)).toBe('  alpha  \n\nbeta');
    });

    it('preserves first occurrence and original order', () => {
      expect(removeDuplicateLines('b\na\nb\na\nc')).toBe('b\na\nc');
      expect(removeDuplicateLines('gamma\nalpha\nbeta\ngamma')).toBe('gamma\nalpha\nbeta');
    });

    it('removes blank lines only when requested', () => {
      expect(removeDuplicateLines('a\n\nb\n\n\nc', { removeEmpty: true })).toBe('a\nb\nc');
    });

    it('trims surrounding whitespace only when requested', () => {
      expect(removeDuplicateLines('  a  \n a', { trim: true })).toBe('a');
      expect(removeDuplicateLines('  a  \n a', { trim: false })).toBe('  a  \n a');
    });

    it('honors case sensitivity options', () => {
      expect(removeDuplicateLines('Alpha\nalpha', { caseSensitive: true })).toBe('Alpha\nalpha');
      expect(removeDuplicateLines('Alpha\nalpha', { caseSensitive: false })).toBe('Alpha');
      expect(removeDuplicateLines('ÁLPHA\nálpha', { caseSensitive: false })).toBe('ÁLPHA');
    });

    it('deduplicates Unicode lines while preserving first occurrence', () => {
      expect(removeDuplicateLines('café\ncafé\ncafe')).toBe('café\ncafe');
      expect(removeDuplicateLines('Кириллица\nКириллица')).toBe('Кириллица');
      expect(removeDuplicateLines('日本語\n日本語')).toBe('日本語');
    });
  });

  // --- 8. JSON FORMATTER ---
  describe('json-formatter (formatJson)', () => {
    it('rejects empty or whitespace input', () => {
      expect(() => formatJson('')).toThrow(/JSON text to format/);
      expect(() => formatJson('   ')).toThrow(/JSON text to format/);
    });

    it('validates and formats JSON with indentation', () => {
      const input = '{"name":"PanUtility","ok":true,"count":42}';
      const formatted = formatJson(input, 'format');
      expect(formatted).toContain('\n  "name": "PanUtility",\n');
    });

    it('minifies valid JSON when requested', () => {
      const input = '{\n  "name": "PanUtility",\n  "ok": true\n}';
      expect(formatJson(input, 'minify')).toBe('{"name":"PanUtility","ok":true}');
    });

    it('throws explicit SyntaxError message for malformed JSON', () => {
      expect(() => formatJson('{"invalid": }')).toThrow(/JSON Syntax Error/);
    });

    it('preserves Unicode content when formatting', () => {
      const formatted = formatJson('{"msg":"héllo 🎉 世界"}', 'format');
      expect(formatted).toContain('héllo 🎉 世界');
    });

    it('round-trips format and minify through JSON.parse', () => {
      const input = '{"a":[1,2,3],"b":{"c":true},"d":null}';
      expect(JSON.parse(formatJson(input, 'format'))).toEqual(JSON.parse(input));
      expect(JSON.parse(formatJson(input, 'minify'))).toEqual(JSON.parse(input));
    });

    it('formats top-level non-object JSON values', () => {
      expect(formatJson('[1,2,3]', 'format')).toBe('[\n  1,\n  2,\n  3\n]');
      expect(formatJson('"hello"', 'format')).toBe('"hello"');
      expect(formatJson('42', 'minify')).toBe('42');
    });

    it('enforces the 5MB input safety limit', () => {
      const huge = `{"data":"${'x'.repeat(5 * 1024 * 1024)}"}`;
      expect(() => formatJson(huge)).toThrow(/5MB safety limit/);
    });
  });

  // --- 9. PERCENTAGE CALCULATOR ---
  describe('percent-calc (percentageOf)', () => {
    it('computes exact percentage', () => {
      expect(percentageOf(20, 150)).toBe(30);
      expect(percentageOf(100, 50)).toBe(50);
      expect(percentageOf(0, 100)).toBe(0);
    });

    it('rounds floating-point noise', () => {
      expect(percentageOf(33.33, 300)).toBe(99.99);
    });

    it('throws error for non-finite inputs', () => {
      expect(() => percentageOf(NaN, 100)).toThrow(/finite/);
      expect(() => percentageOf(10, Infinity)).toThrow(/finite/);
    });
  });

  // --- 10. TIP CALCULATOR ---
  describe('tip-calc (splitTip)', () => {
    it('computes tip, total, and per person split correctly', () => {
      const res = splitTip(100, 20, 2);
      expect(res).toEqual({ tip: 20, total: 120, perPerson: 60 });
    });

    it('handles decimal amounts with two-decimal rounding', () => {
      const res = splitTip(45.50, 15, 3);
      expect(res.tip).toBe(6.83);
      expect(res.total).toBe(52.33);
      expect(res.perPerson).toBe(17.44);
    });

    it('rejects negative bill or tip', () => {
      expect(() => splitTip(-10, 15, 2)).toThrow(/negative/);
      expect(() => splitTip(50, -5, 2)).toThrow(/negative/);
    });

    it('rejects zero or non-integer people count', () => {
      expect(() => splitTip(100, 15, 0)).toThrow(/positive whole integer/);
      expect(() => splitTip(100, 15, 2.5)).toThrow(/positive whole integer/);
    });
  });

  // --- 11. SECURE RANDOM ---
  describe('secure-random (secureRandom)', () => {
    it('returns values within [0, 1)', () => {
      for (let i = 0; i < 100; i++) {
        const value = secureRandom();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('uses the Web Crypto fallback within range for rollDie and RPS', () => {
      for (let i = 0; i < 50; i++) {
        expect(rollDie(6)).toBeGreaterThanOrEqual(1);
        expect(rollDie(6)).toBeLessThanOrEqual(6);
      }
    });
  });

  // --- 12. DICE ROLLER ---
  describe('dice-roller (rollDie)', () => {
    it('rolls die within selected range [1, sides]', () => {
      for (const sides of [4, 6, 8, 10, 12, 20]) {
        const roll = rollDie(sides);
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(sides);
      }
    });

    it('is deterministic when provided a custom random function', () => {
      expect(rollDie(6, () => 0.0)).toBe(1);
      expect(rollDie(6, () => 0.999)).toBe(6);
      expect(rollDie(20, () => 0.5)).toBe(11);
    });

    it('rejects invalid die sides (< 2 or non-integer)', () => {
      expect(() => rollDie(1)).toThrow(/at least 2/);
      expect(() => rollDie(6.5)).toThrow(/integer/);
    });
  });

  // --- 13. ROCK PAPER SCISSORS ---
  describe('rock-paper-scissors (playRockPaperScissors)', () => {
    it('evaluates complete win/lose/draw outcome matrix', () => {
      // computer returns choice index based on random value
      const mockRandom = (idx: 0 | 1 | 2) => () => idx / 3 + 0.01; // 0: rock, 1: paper, 2: scissors

      expect(playRockPaperScissors('rock', mockRandom(2))).toMatchObject({ computer: 'scissors', result: 'win' });
      expect(playRockPaperScissors('rock', mockRandom(1))).toMatchObject({ computer: 'paper', result: 'lose' });
      expect(playRockPaperScissors('rock', mockRandom(0))).toMatchObject({ computer: 'rock', result: 'draw' });

      expect(playRockPaperScissors('paper', mockRandom(0))).toMatchObject({ computer: 'rock', result: 'win' });
      expect(playRockPaperScissors('paper', mockRandom(2))).toMatchObject({ computer: 'scissors', result: 'lose' });
      expect(playRockPaperScissors('paper', mockRandom(1))).toMatchObject({ computer: 'paper', result: 'draw' });

      expect(playRockPaperScissors('scissors', mockRandom(1))).toMatchObject({ computer: 'paper', result: 'win' });
      expect(playRockPaperScissors('scissors', mockRandom(0))).toMatchObject({ computer: 'rock', result: 'lose' });
      expect(playRockPaperScissors('scissors', mockRandom(2))).toMatchObject({ computer: 'scissors', result: 'draw' });
    });

    it('throws error for invalid player choice', () => {
      expect(() => playRockPaperScissors('lizard' as unknown as 'rock')).toThrow(/Player choice must be/);
    });
  });

});

