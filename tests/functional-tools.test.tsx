import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import ColorExtractor from '../src/components/ColorExtractor';
import ImageConverter from '../src/components/ImageConverter';
import PdfCompiler from '../src/components/PdfCompiler';
import { ToastProvider } from '../src/components/Toast';
import { convertCase, countText, formatJson, generateLorem, percentageOf, playRockPaperScissors, removeDuplicateLines, rollDie, splitTip } from '../src/lib/toolTransforms';

const renderTool = (component: ReactNode) => render(<ToastProvider>{component}</ToastProvider>);

describe('audited functional tool smoke coverage', () => {
  it('image-converter renders its upload workspace', () => { renderTool(<ImageConverter onBack={() => undefined} />); expect(screen.getByText(/image format converter/i)).toBeInTheDocument(); });
  it('color-extractor renders its upload workspace', () => { renderTool(<ColorExtractor onBack={() => undefined} />); expect(screen.getByText(/color palette extractor/i)).toBeInTheDocument(); });
  it('pdf-compiler renders its upload workspace', () => { renderTool(<PdfCompiler onBack={() => undefined} />); expect(screen.getByText(/pdf compiler/i)).toBeInTheDocument(); });
  it('case-converter transforms text', () => expect(convertCase('hello world', 'title')).toBe('Hello World'));
  it('word-counter returns deterministic counts', () => expect(countText('one two\nthree')).toMatchObject({ words: 3, characters: 13, lines: 2 }));
  it('lorem-ipsum emits the requested paragraphs', () => expect(generateLorem(2).split('\n\n')).toHaveLength(2));
  it('line-remover preserves first unique lines', () => expect(removeDuplicateLines('a\nb\na\n')).toBe('a\nb'));
  it('json-formatter validates and formats JSON', () => expect(formatJson('{"ok":true}')).toContain('\n  "ok": true\n'));
  it('percentage calculator computes a percentage', () => expect(percentageOf(25, 80)).toBe(20));
  it('tip calculator validates and splits totals', () => expect(splitTip(100, 20, 2)).toEqual({ tip: 20, total: 120, perPerson: 60 }));
  it('dice roller stays within its die', () => expect(rollDie(6, () => 0.5)).toBe(4));
  it('rock-paper-scissors resolves a deterministic round', () => expect(playRockPaperScissors('rock', () => 0.99)).toMatchObject({ computer: 'scissors', result: 'win' }));
});
