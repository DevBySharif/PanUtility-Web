import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GenericUtilityWorkspace from '../src/components/GenericUtilityWorkspace';
import { TOOL_BY_ID } from '../src/toolsData';

vi.mock('gifshot', () => ({ default: { isSupported: () => true, createGIF: () => undefined, stopAnimation: () => undefined } }));

const back = () => undefined;

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

const typeIntoSource = (value: string) => {
  const input = screen.getByPlaceholderText('Type or paste your content here...') as HTMLTextAreaElement;
  fireEvent.change(input, { target: { value } });
};

const readOutput = () => {
  const output = screen.getByPlaceholderText('Processed results will compile here...') as HTMLTextAreaElement;
  return output.value;
};

describe('P1-B2 text tool workspaces (GenericUtilityWorkspace)', () => {
  it('lorem-ipsum generates deterministic output and copy works', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['lorem-ipsum']} onBack={back} />);

    const generate = screen.getByRole('button', { name: /Generate Lorem Ipsum/i });
    fireEvent.click(generate);
    const first = readOutput();
    expect(first).toContain('Lorem ipsum');
    expect(first.split('\n\n').length).toBeGreaterThanOrEqual(1);

    fireEvent.click(generate);
    expect(readOutput()).toBe(first);

    const copy = screen.getByRole('button', { name: /Copy/i });
    fireEvent.click(copy);
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(first);
  });

  it('lorem-ipsum Clear Fields resets source and output', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['lorem-ipsum']} onBack={back} />);

    typeIntoSource('draft text');
    fireEvent.click(screen.getByRole('button', { name: /Generate Lorem Ipsum/i }));
    expect(readOutput()).not.toBe('');

    fireEvent.click(screen.getByRole('button', { name: /Clear Fields/i }));
    expect(readOutput()).toBe('');
    expect(screen.getByPlaceholderText('Type or paste your content here...')).toHaveValue('');
  });

  it('lorem-ipsum paragraph count respects the 1..20 UI bound', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['lorem-ipsum']} onBack={back} />);

    const countInput = screen.getByDisplayValue('12') as HTMLInputElement;
    fireEvent.change(countInput, { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Lorem Ipsum/i }));
    expect(readOutput().split('\n\n')).toHaveLength(20);

    fireEvent.change(screen.getByDisplayValue('20'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate Lorem Ipsum/i }));
    expect(readOutput().split('\n\n')).toHaveLength(1);
  });

  it('word-counter reports paragraphs and reading time in real time', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['word-counter']} onBack={back} />);

    typeIntoSource('One two three\n\nFour five six');
    const output = readOutput();
    expect(output).toContain('Words: 6');
    expect(output).toContain('Paragraphs: 2');
    expect(output).toContain('Reading Time:');
    expect(output).toContain('(est.)');
  });

  it('line-remover keeps raw whitespace and blank lines by default', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['line-remover']} onBack={back} />);

    typeIntoSource('  alpha  \n\n  alpha  \n\nbeta');
    fireEvent.click(screen.getByRole('button', { name: /Deduplicate Lines/i }));
    expect(readOutput()).toBe('  alpha  \n\nbeta');
    expect(screen.getByText(/keeps raw whitespace, keeps blank lines, case-sensitive/)).toBeInTheDocument();
  });

  it('line-remover honors trim, remove blank, and case-insensitive options', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['line-remover']} onBack={back} />);

    fireEvent.click(screen.getByRole('checkbox', { name: /Trim whitespace/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Remove blank lines/i }));
    fireEvent.click(screen.getByRole('checkbox', { name: /Case-sensitive/i }));

    typeIntoSource('  Alpha  \n\nalpha\n\nBeta');
    fireEvent.click(screen.getByRole('button', { name: /Deduplicate Lines/i }));
    expect(readOutput()).toBe('Alpha\nBeta');
    expect(screen.getByText(/trims whitespace, removes blank lines, case-insensitive/)).toBeInTheDocument();
  });

  it('case-converter exposes PascalCase and kebab-case modes', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['case-converter']} onBack={back} />);

    typeIntoSource('hello world test');

    fireEvent.click(screen.getByRole('button', { name: /PascalCase/i }));
    expect(readOutput()).toBe('HelloWorldTest');

    fireEvent.click(screen.getByRole('button', { name: /kebab-case/i }));
    expect(readOutput()).toBe('hello-world-test');
  });
});
