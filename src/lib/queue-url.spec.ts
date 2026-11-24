import { describe, expect, it } from 'vitest';
import { monthLabel, queueFromUrl, queueUrl, tabFromUrl, windowLabel } from './queue-url';

describe('queue view in the URL (#20 / #21)', () => {
  it('reads the view from the URL; nothing there -> null (saved filters apply)', () => {
    expect(queueFromUrl('')).toBeNull();
    expect(queueFromUrl('?finished=1')).toBeNull();
    expect(queueFromUrl('?tab=all&from=2026-09-01&to=2026-09-30&dx=urti')).toEqual({ tab: 'all', from: '2026-09-01', to: '2026-09-30', dx: 'urti' });
  });
  it('redFlag=1 is the readable alias of followUp=1; bad values are dropped', () => {
    expect(queueFromUrl('?redFlag=1')).toEqual({ followUp: '1' });
    expect(queueFromUrl('?population=kids&tab=x')).toBeNull();
  });
  it('writes the view back, keeping other params and leaving defaults out', () => {
    expect(queueUrl('', { sort: 'missed', page: 3, limit: 25 }, 'todo')).toBe('');
    expect(queueUrl('?finished=1&dx=old', { range: 'all', followUp: '1', sort: 'oldest' }, 'all')).toBe('?finished=1&tab=all&range=all&followUp=1&sort=oldest');
    expect(queueUrl('?redFlag=1', {}, 'todo')).toBe('');
  });
  it('round-trips', () => {
    const q = { from: '2026-09-01', to: '2026-09-30', population: 'paediatric', followUp: '1' };
    expect(queueFromUrl(queueUrl('', q, 'done'))).toEqual({ tab: 'done', ...q });
    expect(tabFromUrl(queueUrl('', q, 'done'))).toBe('done');
    expect(tabFromUrl('')).toBeNull();
  });
  it('labels months and the window the server applied', () => {
    expect(monthLabel('2026-09')).toBe('Sep 2026');
    const base = { days: 45, recentFrom: '2026-10-11', to: null };
    expect(windowLabel({ ...base, from: '2026-10-11', recent: true })).toBe('last 45 days, since 11 Oct 2026');
    expect(windowLabel({ ...base, from: '2026-09-01', to: '2026-09-30', recent: false })).toBe('1 Sep 2026 – 30 Sep 2026');
    expect(windowLabel({ ...base, from: null, recent: false })).toBe('all dates');
    expect(windowLabel({ ...base, from: '2026-10-11', recent: true }, true)).toBe('every date (ID search)');
  });
});
