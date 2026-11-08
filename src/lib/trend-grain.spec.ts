import { describe, expect, it } from 'vitest';
import { trendWeekly } from './trend-grain';

describe('trendWeekly', () => {
  it('Last 7 days stays daily even on low-volume days', () => {
    expect(trendWeekly([3, 5, 2, 8, 4, 6, 1])).toBe(false);
  });
  it('14 active days or fewer stay daily', () => {
    expect(trendWeekly(Array(14).fill(2))).toBe(false);
  });
  it('a longer low-volume range goes weekly (median under 20)', () => {
    expect(trendWeekly(Array(30).fill(12))).toBe(true);
  });
  it('a longer busy range stays daily', () => {
    expect(trendWeekly(Array(30).fill(45))).toBe(false);
  });
  it('no days: daily', () => {
    expect(trendWeekly([])).toBe(false);
  });
});
