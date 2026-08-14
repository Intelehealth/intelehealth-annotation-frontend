import { describe, expect, it } from 'vitest';
import { parseCsv } from '../csv';

describe('parseCsv', () => {
  it('parses a basic CSV with header + rows', () => {
    const input = 'name,city\nAlice,Bangalore\nRahul,Mangalore\nPriya,Udupi';
    const out = parseCsv(input);
    expect(out.columns).toEqual(['name', 'city']);
    expect(out.rows).toEqual([
      ['Alice', 'Bangalore'],
      ['Rahul', 'Mangalore'],
      ['Priya', 'Udupi'],
    ]);
  });

  it('keeps a comma inside a quoted field as one cell', () => {
    const input = 'name,address\nAlice,"Bangalore, Karnataka"\nBob,"Mangalore, Karnataka"';
    const out = parseCsv(input);
    expect(out.columns).toEqual(['name', 'address']);
    expect(out.rows).toEqual([
      ['Alice', 'Bangalore, Karnataka'],
      ['Bob', 'Mangalore, Karnataka'],
    ]);
  });

  it('unwraps escaped quotes (double "")', () => {
    const input = 'note,text\n1,"He said ""hello"""\n2,plain';
    const out = parseCsv(input);
    expect(out.rows[0]).toEqual(['1', 'He said "hello"']);
    expect(out.rows[1]).toEqual(['2', 'plain']);
  });

  it('preserves empty cells but skips truly blank lines', () => {
    const input = 'name,age,city\nAlice,,Bangalore\n\nRahul,28,Mangalore';
    const out = parseCsv(input);
    expect(out.columns).toEqual(['name', 'age', 'city']);
    expect(out.rows).toEqual([
      ['Alice', '', 'Bangalore'],
      ['Rahul', '28', 'Mangalore'],
    ]);
  });

  it('handles CRLF line endings', () => {
    const input = 'name,city\r\nAlice,Bangalore\r\nRahul,Mangalore\r\n';
    const out = parseCsv(input);
    expect(out.columns).toEqual(['name', 'city']);
    expect(out.rows).toEqual([
      ['Alice', 'Bangalore'],
      ['Rahul', 'Mangalore'],
    ]);
  });

  it('handles bare LF line endings', () => {
    const input = 'name,city\nAlice,Bangalore\nRahul,Mangalore';
    const out = parseCsv(input);
    expect(out.rows).toHaveLength(2);
    expect(out.rows[0]).toEqual(['Alice', 'Bangalore']);
  });

  it('strips a UTF-8 BOM from the first header cell', () => {
    const input = '\uFEFFname,city\nAlice,Bangalore';
    const out = parseCsv(input);
    expect(out.columns).toEqual(['name', 'city']);
  });

  it('returns columns with zero rows for a header-only CSV', () => {
    const input = 'name,age';
    const out = parseCsv(input);
    expect(out.columns).toEqual(['name', 'age']);
    expect(out.rows).toEqual([]);
  });

  it('does not emit a spurious row for a trailing newline', () => {
    const input = 'name,city\nAlice,Bangalore\n';
    const out = parseCsv(input);
    expect(out.rows).toEqual([['Alice', 'Bangalore']]);
  });

  it('returns empty columns/rows for an empty CSV', () => {
    expect(parseCsv('')).toEqual({ columns: [], rows: [] });
    expect(parseCsv('\n\n')).toEqual({ columns: [], rows: [] });
  });

  it('preserves newlines inside a quoted multiline field', () => {
    const input = 'id,note\n1,"line one\nline two"\n2,x';
    const out = parseCsv(input);
    expect(out.rows[0]).toEqual(['1', 'line one\nline two']);
    expect(out.rows[1]).toEqual(['2', 'x']);
  });

  it('keeps ragged rows exactly as parsed without padding', () => {
    const input = 'a,b,c\n1\n2,3\n4,5,6';
    const out = parseCsv(input);
    expect(out.rows).toEqual([['1'], ['2', '3'], ['4', '5', '6']]);
  });

  it('keeps whitespace inside quoted fields intact', () => {
    const input = 'k,v\n1,"  spaced  "';
    const out = parseCsv(input);
    expect(out.rows[0]).toEqual(['1', '  spaced  ']);
  });
});