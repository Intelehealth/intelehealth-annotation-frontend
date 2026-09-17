import { describe, expect, it } from 'vitest';
import { hasRenderableContent } from '../svg';

describe('hasRenderableContent (empty-state detector only)', () => {
  it('detects a real structured SVG with shapes + text', () => {
    const svg = `<svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="100" height="50" fill="blue"/>
      <text x="20" y="90" font-size="16">Invoice Item</text>
    </svg>`;
    expect(hasRenderableContent(svg)).toBe(true);
  });

  it('detects a text-only SVG as renderable', () => {
    const svg = `<svg width="400" height="200"><text x="20" y="45">Memo Note</text></svg>`;
    expect(hasRenderableContent(svg)).toBe(true);
  });

  it('returns false for an empty SVG', () => {
    expect(hasRenderableContent('<svg xmlns="http://www.w3.org/2000/svg"></svg>')).toBe(false);
  });

  it('returns false for whitespace/BOM-only input', () => {
    expect(hasRenderableContent('\uFEFF\n  \n')).toBe(false);
    expect(hasRenderableContent('')).toBe(false);
    expect(hasRenderableContent(null)).toBe(false);
    expect(hasRenderableContent(undefined)).toBe(false);
  });

  it('returns false when only <defs> exists', () => {
    const svg = `<svg><defs><linearGradient id="g"><stop offset="0%"/></linearGradient></defs></svg>`;
    expect(hasRenderableContent(svg)).toBe(false);
  });

  it('returns false when only <title>/<metadata> exist', () => {
    const svg = `<svg><title>Empty doc</title><metadata>meta</metadata></svg>`;
    expect(hasRenderableContent(svg)).toBe(false);
  });

  it('returns false for comments and XML prolog only', () => {
    const svg = `<?xml version="1.0"?><!-- just a comment --><svg></svg>`;
    expect(hasRenderableContent(svg)).toBe(false);
  });

  it('returns true even with defs present alongside real content', () => {
    const svg = `<svg><defs><linearGradient id="g"/></defs><rect fill="url(#g)" width="10" height="10"/></svg>`;
    expect(hasRenderableContent(svg)).toBe(true);
  });

  it('returns false for text that is not an SVG at all (no tags)', () => {
    expect(hasRenderableContent('this is not svg')).toBe(false);
  });
});