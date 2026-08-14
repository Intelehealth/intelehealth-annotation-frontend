import { describe, expect, it } from 'vitest';
import { isTableEmpty } from '../table-data';

describe('isTableEmpty', () => {
  it('is empty when there are no columns', () => {
    expect(isTableEmpty([], [['a']])).toBe(true);
  });

  it('is empty when there are no rows', () => {
    expect(isTableEmpty(['name', 'age'], [])).toBe(true);
  });

  it('is empty when both are absent', () => {
    expect(isTableEmpty([], [])).toBe(true);
  });

  it('is NOT empty for a row of empty cells', () => {
    expect(isTableEmpty(['name', 'age'], [['', '']])).toBe(false);
  });

  it('is NOT empty for a header with real rows', () => {
    expect(isTableEmpty(['name', 'age'], [['Bhoomi', '23']])).toBe(false);
  });

  it('is NOT empty for empty cells mixed with real values', () => {
    expect(isTableEmpty(['name', 'age', 'city'], [['', '23', 'Bangalore']])).toBe(false);
  });
});