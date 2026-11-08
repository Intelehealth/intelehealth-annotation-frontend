import { describe, expect, it } from 'vitest';
import { presetRange, previousRange, timeSlots } from './period-range';

// Thu 5 Nov 2026, 15:00 IST (09:30 UTC).
const NOW = new Date('2026-11-05T09:30:00Z');

describe('presetRange (B2)', () => {
  it('Last 7 days = same weekday last week -> today (Thu 29 Oct -> Thu 5 Nov)', () => {
    expect(presetRange('7', NOW)).toEqual(['2026-10-29', '2026-11-05']);
  });
  it('Last 30 days = today - 30 -> today', () => {
    expect(presetRange('30', NOW)).toEqual(['2026-10-06', '2026-11-05']);
  });
  it('the pill / select switching sequence never changes Last 7 days (pure, no carried state)', () => {
    const seq = ['month', '7', 'week', '7', 'all', '7', '30', '7', 'today', 'quarter', 'year', 'yesterday', '7'];
    for (const k of seq) if (k === '7') expect(presetRange(k, NOW)).toEqual(['2026-10-29', '2026-11-05']);
    // and the month-start presets are the only ones that start on the 1st
    expect(presetRange('month', NOW)).toEqual(['2026-11-01', '2026-11-05']);
    expect(presetRange('week', NOW)).toEqual(['2026-11-02', '2026-11-05']);
  });
  it('uses the IST calendar date (late evening UTC is already the next IST day)', () => {
    expect(presetRange('today', new Date('2026-11-04T19:00:00Z'))).toEqual(['2026-11-05', '2026-11-05']);
    expect(presetRange('7', new Date('2026-11-04T19:00:00Z'))).toEqual(['2026-10-29', '2026-11-05']);
  });
  it('other presets', () => {
    expect(presetRange('yesterday', NOW)).toEqual(['2026-11-04', '2026-11-04']);
    expect(presetRange('quarter', NOW)).toEqual(['2026-10-01', '2026-11-05']);
    expect(presetRange('year', NOW)).toEqual(['2026-01-01', '2026-11-05']);
    expect(presetRange('all', NOW)).toEqual([undefined, undefined]);
  });
});

describe('previousRange', () => {
  it('is the equal-length window just before (8 days before 29 Oct)', () => {
    expect(previousRange('2026-10-29', '2026-11-05')).toEqual({ from: '2026-10-21', to: '2026-10-28' });
    expect(previousRange(undefined, undefined)).toBeNull();
  });
});

describe('timeSlots (B1)', () => {
  it('one slot per day in the range, weekend / no-visit days included', () => {
    expect(timeSlots('2026-10-29', '2026-11-05', false)).toEqual(['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05']);
  });
  it('weekly slots are the Mondays covering the range', () => {
    expect(timeSlots('2026-10-06', '2026-11-05', true)).toEqual(['2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
  });
  it('an empty or reversed range has no slots', () => {
    expect(timeSlots('2026-11-05', '2026-11-01', false)).toEqual([]);
  });
});
