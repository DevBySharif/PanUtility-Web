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

const fill = (label: string, value: string) => {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
};

const submitForm = () => {
  const form = document.querySelector('form');
  if (!form) throw new Error('Expected a form to be present.');
  fireEvent.submit(form);
};

describe('P1-B3 calculator workspaces (GenericUtilityWorkspace)', () => {
  it('percent-calc computes "what is X% of Y" with stripped decimals', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['percent-calc']} onBack={back} />);

    fill('Percentage (%)', '25');
    fill('Base value', '200');
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));

    expect(screen.getByText('25% of 200 = 50')).toBeInTheDocument();
  });

  it('percent-calc supports zero and decimal percentages', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['percent-calc']} onBack={back} />);

    fill('Percentage (%)', '0');
    fill('Base value', '100');
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(screen.getByText('0% of 100 = 0')).toBeInTheDocument();

    fill('Percentage (%)', '12.5');
    fill('Base value', '80');
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(screen.getByText('12.5% of 80 = 10')).toBeInTheDocument();
  });

  it('percent-calc rejects blank input and clears stale results', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['percent-calc']} onBack={back} />);

    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Percentage is required.');

    fill('Percentage (%)', '10');
    fill('Base value', '50');
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(screen.getByText('10% of 50 = 5')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('percent-calc updates on repeated calculations and Enter submission', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['percent-calc']} onBack={back} />);

    fill('Percentage (%)', '20');
    fill('Base value', '150');
    submitForm();
    expect(screen.getByText('20% of 150 = 30')).toBeInTheDocument();

    fill('Percentage (%)', '50');
    fill('Base value', '40');
    submitForm();
    expect(screen.getByText('50% of 40 = 20')).toBeInTheDocument();
  });

  it('percent-calc reset clears inputs, result, and errors', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['percent-calc']} onBack={back} />);

    fill('Percentage (%)', '25');
    fill('Base value', '200');
    fireEvent.click(screen.getByRole('button', { name: 'Calculate' }));
    expect(screen.getByText('25% of 200 = 50')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByText('25% of 200 = 50')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Percentage (%)')).toHaveValue(null);
    expect(screen.getByLabelText('Base value')).toHaveValue(null);
  });

  it('percent-calc result region is announced politely', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['percent-calc']} onBack={back} />);
    const region = screen.getByText('Enter a percentage and base value, then press Calculate.').closest('[aria-live="polite"]');
    expect(region).not.toBeNull();
  });
});

describe('P1-B3 tip calculator workspace (GenericUtilityWorkspace)', () => {
  it('tip-calc computes tip, total, and per-person split', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['tip-calc']} onBack={back} />);

    fill('Bill Amount ($)', '100');
    fill('Number of People', '2');
    fireEvent.click(screen.getByRole('button', { name: '20% Tip' }));

    expect(screen.getByText(/Tip Subtotal \(20%\): \$20\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Combined Total: \$120\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Individual Share \(2 people\): \$60\.00 per person/)).toBeInTheDocument();
  });

  it('tip-calc supports zero bill and decimal amounts', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['tip-calc']} onBack={back} />);

    fill('Bill Amount ($)', '0');
    fireEvent.click(screen.getByRole('button', { name: '10% Tip' }));
    expect(screen.getByText(/Tip Subtotal \(10%\): \$0\.00/)).toBeInTheDocument();

    fill('Bill Amount ($)', '45.50');
    fill('Number of People', '3');
    fill('Tip Percentage (%)', '15');
    submitForm();
    expect(screen.getByText(/Tip Subtotal \(15%\): \$6\.83/)).toBeInTheDocument();
    expect(screen.getByText(/Combined Total: \$52\.33/)).toBeInTheDocument();
  });

  it('tip-calc rejects blank, negative, and fractional inputs', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['tip-calc']} onBack={back} />);

    fireEvent.click(screen.getByRole('button', { name: 'Calculate Split' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Bill amount is required.');

    fill('Bill Amount ($)', '-5');
    fill('Number of People', '2');
    submitForm();
    expect(screen.getByRole('alert')).toHaveTextContent('Bill amount must be at least 0.');

    fill('Bill Amount ($)', '50');
    fill('Number of People', '2.5');
    submitForm();
    expect(screen.getByRole('alert')).toHaveTextContent('Number of people must be a whole number.');

    fill('Bill Amount ($)', '50');
    fill('Number of People', '0');
    submitForm();
    expect(screen.getByRole('alert')).toHaveTextContent('Number of people must be at least 1.');
  });

  it('tip-calc reset clears inputs and results', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['tip-calc']} onBack={back} />);

    fill('Bill Amount ($)', '100');
    fireEvent.click(screen.getByRole('button', { name: '15% Tip' }));
    expect(screen.getByText(/Tip Subtotal \(15%\):/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByText(/Tip Subtotal \(15%\):/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Bill Amount ($)')).toHaveValue(null);
  });

  it('tip-calc result region is announced politely', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['tip-calc']} onBack={back} />);
    const region = screen.getByText('Enter bill info and click a tip percentage or Calculate.').closest('[aria-live="polite"]');
    expect(region).not.toBeNull();
  });
});

describe('P1-B3 dice roller workspace (GenericUtilityWorkspace)', () => {
  it('dice-roller rolls within the selected die range', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['dice-roller']} onBack={back} />);

    fireEvent.click(screen.getByRole('button', { name: 'Roll D6' }));
    expect(screen.getByText(/Rolled D6: [1-6]/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Roll D20' }));
    expect(screen.getByText(/Rolled D20: ([1-9]|1[0-9]|20)/)).toBeInTheDocument();
  });

  it('dice-roller exposes exactly the supported die set', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['dice-roller']} onBack={back} />);
    for (const sides of [4, 6, 8, 10, 12, 20]) {
      expect(screen.getByRole('button', { name: `Roll D${sides}` })).toBeInTheDocument();
    }
    expect(screen.queryByRole('button', { name: 'Roll D100' })).not.toBeInTheDocument();
  });

  it('dice-roller reset clears the roll and stays honest about entertainment use', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['dice-roller']} onBack={back} />);

    fireEvent.click(screen.getByRole('button', { name: 'Roll D4' }));
    expect(screen.getByText(/Rolled D4: [1-4]/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset Roll' }));
    expect(screen.queryByText(/Rolled D4:/)).not.toBeInTheDocument();
    expect(screen.getByText(/not for gambling/)).toBeInTheDocument();
  });

  it('dice-roller result is announced politely', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['dice-roller']} onBack={back} />);
    const region = screen.getByText('Pick a die to roll.').closest('[aria-live="polite"]');
    expect(region).not.toBeNull();
  });
});

describe('P1-B3 rock-paper-scissors workspace (GenericUtilityWorkspace)', () => {
  it('rps plays a round against a computer opponent and shows a result', async () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['rock-paper-scissors']} onBack={back} />);

    fireEvent.click(screen.getByRole('button', { name: 'rock' }));
    expect(screen.getByText(/Player: ROCK \| Computer: (ROCK|PAPER|SCISSORS)/)).toBeInTheDocument();
    expect(screen.getByText(/Result: (YOU WIN!|YOU LOSE|DRAW!)/)).toBeInTheDocument();
  });

  it('rps exposes all three gestures and computer-opponent copy', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['rock-paper-scissors']} onBack={back} />);

    expect(screen.getByRole('button', { name: 'rock' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'paper' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'scissors' })).toBeInTheDocument();
    expect(screen.getAllByText(/random computer opponent/).length).toBeGreaterThanOrEqual(1);
  });

  it('rps reset clears the result and score', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['rock-paper-scissors']} onBack={back} />);

    fireEvent.click(screen.getByRole('button', { name: 'rock' }));
    expect(screen.getByText(/Player: ROCK \| Computer:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(screen.queryByText(/Player: ROCK \| Computer:/)).not.toBeInTheDocument();
    expect(screen.getByText('Score: 0')).toBeInTheDocument();
  });

  it('rps result is announced politely', () => {
    render(<GenericUtilityWorkspace tool={TOOL_BY_ID['rock-paper-scissors']} onBack={back} />);
    const region = screen.getByText('Choose rock, paper, or scissors to play a round.').closest('[aria-live="polite"]');
    expect(region).not.toBeNull();
  });
});
