export function convertCase(value: string, mode: 'upper' | 'lower' | 'title' | 'sentence' | 'camel' | 'snake'): string {
  if (mode === 'upper') return value.toUpperCase();
  if (mode === 'lower') return value.toLowerCase();
  if (mode === 'title') return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
  if (mode === 'sentence') return value.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, (letter) => letter.toUpperCase());
  const words = value.trim().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (mode === 'snake') return words.map((word) => word.toLowerCase()).join('_');
  return words.map((word, index) => index === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join('');
}

export function countText(value: string) {
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return { words, characters: value.length, charactersWithoutSpaces: value.replace(/\s/g, '').length, lines: value ? value.split(/\r?\n/).length : 0 };
}

export function generateLorem(paragraphs: number): string {
  const count = Math.min(10, Math.max(1, Math.trunc(paragraphs)));
  const paragraph = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur sed diam id nisi interdum faucibus, tempor nec purus.';
  return Array.from({ length: count }, () => paragraph).join('\n\n');
}

export function removeDuplicateLines(value: string): string {
  return [...new Set(value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))].join('\n');
}

export function formatJson(value: string): string {
  return JSON.stringify(JSON.parse(value), null, 2);
}

export function percentageOf(percent: number, value: number): number {
  if (!Number.isFinite(percent) || !Number.isFinite(value)) throw new Error('Values must be finite numbers.');
  return (percent / 100) * value;
}

export function splitTip(bill: number, tipPercent: number, people: number) {
  if (![bill, tipPercent, people].every(Number.isFinite) || bill < 0 || tipPercent < 0 || people <= 0) throw new Error('Enter valid bill, tip, and people values.');
  const tip = bill * tipPercent / 100;
  return { tip, total: bill + tip, perPerson: (bill + tip) / people };
}

export function rollDie(sides: number, random = Math.random): number {
  if (!Number.isInteger(sides) || sides < 2) throw new Error('Die sides must be an integer of at least 2.');
  return Math.floor(random() * sides) + 1;
}

export function playRockPaperScissors(player: 'rock' | 'paper' | 'scissors', random = Math.random) {
  const choices = ['rock', 'paper', 'scissors'] as const;
  const computer = choices[Math.floor(random() * choices.length)];
  const result = player === computer ? 'draw' : (player === 'rock' && computer === 'scissors') || (player === 'paper' && computer === 'rock') || (player === 'scissors' && computer === 'paper') ? 'win' : 'lose';
  return { player, computer, result };
}

export function decodeUrlSafely(value: string): { value?: string; error?: string } {
  try { return { value: decodeURIComponent(value) }; }
  catch { return { error: 'Invalid URL-encoded input.' }; }
}

export function decodeBase64Safely(value: string): { value?: string; error?: string } {
  try { return { value: decodeURIComponent(Array.from(atob(value), (character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`).join('')) }; }
  catch { return { error: 'Invalid Base64 input.' }; }
}
