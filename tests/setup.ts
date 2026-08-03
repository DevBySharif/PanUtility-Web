import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => cleanup());

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
});

Object.defineProperty(URL, 'createObjectURL', { writable: true, value: () => 'blob:test' });
Object.defineProperty(URL, 'revokeObjectURL', { writable: true, value: () => undefined });
