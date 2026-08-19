import { describe, expect, it } from 'vitest';
import { adjustDiagramZoom, formatDiagramZoom } from '../../src/lib/diagramZoom';

describe('diagram zoom', () => {
  it('changes zoom in readable steps and resets to fit width', () => {
    expect(adjustDiagramZoom(1, 'in')).toBe(1.25);
    expect(adjustDiagramZoom(1.25, 'out')).toBe(1);
    expect(adjustDiagramZoom(2, 'reset')).toBe(1);
  });

  it('keeps zoom within the supported viewing range', () => {
    expect(adjustDiagramZoom(3, 'in')).toBe(3);
    expect(adjustDiagramZoom(0.5, 'out')).toBe(0.5);
  });

  it('formats the current scale for the visible status', () => {
    expect(formatDiagramZoom(1)).toBe('100%');
    expect(formatDiagramZoom(1.25)).toBe('125%');
  });
});
