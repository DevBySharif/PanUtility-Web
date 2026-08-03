import { describe, expect, it } from 'vitest';
import { isToolId, TOOL_BY_ID, TOOL_REGISTRY } from '../src/toolsData';

describe('typed tool registry', () => {
  it('contains exactly 113 unique route definitions', () => {
    expect(TOOL_REGISTRY).toHaveLength(113);
    expect(new Set(TOOL_REGISTRY.map((tool) => tool.id)).size).toBe(113);
  });

  it('uses the zero-cost catalog totals and disables transcription truthfully', () => {
    const totals = Object.fromEntries(['functional', 'beta', 'coming-soon', 'disabled'].map((status) => [status, TOOL_REGISTRY.filter((tool) => tool.status === status).length]));
    expect(totals).toEqual({ functional: 12, beta: 30, 'coming-soon': 51, disabled: 20 });
    expect(TOOL_BY_ID['audio-transcriber']).toMatchObject({ status: 'disabled', processingType: 'none', isIndexable: false });
    expect(TOOL_BY_ID['audio-transcriber'].componentKey).toBeUndefined();
    expect(TOOL_BY_ID['audio-transcriber'].statusReason).toMatch(/Server-based transcription is temporarily unavailable/i);
  });

  it('uses only valid statuses and processing types', () => {
    expect(TOOL_REGISTRY.every((tool) => ['functional', 'beta', 'coming-soon', 'disabled'].includes(tool.status))).toBe(true);
    expect(TOOL_REGISTRY.every((tool) => ['browser', 'server', 'external', 'none'].includes(tool.processingType))).toBe(true);
  });

  it('resolves every route through the typed lookup', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(isToolId(tool.id)).toBe(true);
      expect(TOOL_BY_ID[tool.id]).toBe(tool);
    }
  });

  it.each(['disabled', 'coming-soon'] as const)('%s tools are neither featured nor indexable', (status) => {
    for (const tool of TOOL_REGISTRY.filter((candidate) => candidate.status === status)) {
      expect(tool.isFeatured).toBe(false);
      expect(tool.isIndexable).toBe(false);
      expect(tool.componentKey).toBeUndefined();
    }
  });

  it('uses processing type none only for unavailable tools', () => {
    for (const tool of TOOL_REGISTRY) {
      expect(tool.processingType === 'none').toBe(tool.status === 'disabled' || tool.status === 'coming-soon');
    }
  });

  it('provides privacy notices for every server and external tool', () => {
    for (const tool of TOOL_REGISTRY.filter((candidate) => candidate.processingType === 'server' || candidate.processingType === 'external')) {
      expect(tool.privacyNotice).toBeTruthy();
    }
  });

  it('provides a reason for every disabled tool', () => {
    for (const tool of TOOL_REGISTRY.filter((candidate) => candidate.status === 'disabled')) expect(tool.statusReason).toBeTruthy();
  });
});
