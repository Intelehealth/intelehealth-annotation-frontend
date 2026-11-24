import { describe, expect, it } from 'vitest';
import { bucketRange, drillHref, drillOf, unitOf } from './drill';
import { queueFromUrl, queueUrl } from './queue-url';

const base = { workspaceId: 'w1', from: '2026-11-01', to: '2026-11-30', population: 'paediatric', followUps: 'include', dxMatch: 'assisted' };

describe('drill-down links (#20 / #29)', () => {
  it('carries the metric, the row and the dashboard filters; opens tab All', () => {
    const href = drillHref(base, { m: 'top1', doctor: 'D7', finalDx: 'urti' }, 'URTI · top 1');
    const p = new URLSearchParams(href.split('?')[1]);
    expect(href.startsWith('/workspaces/w1/mismatch?')).toBe(true);
    expect(Object.fromEntries(p)).toEqual({
      tab: 'all', dm: 'top1', ddoc: 'D7', dfx: 'urti', dfrom: '2026-11-01', dto: '2026-11-30', dpopn: 'paediatric',
      dfu: 'include', dmatch: 'assisted', dl: 'URTI · top 1',
    });
  });

  it('a week / month row narrows the dates to that row inside the dashboard range', () => {
    const p = new URLSearchParams(drillHref(base, { m: 'top5', ...bucketRange('2026-10-27', 'week') }, 'w').split('?')[1]);
    expect([p.get('dfrom'), p.get('dto')]).toEqual(['2026-11-01', '2026-11-02']);
    expect(bucketRange('2026-02', 'month')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(bucketRange('2026-11-05', 'day')).toEqual({ from: '2026-11-05', to: '2026-11-05' });
  });

  it('names the unit when it is not a visit', () => {
    expect(unitOf('med_changed')).toBe('medicines');
    expect(unitOf('conf_picked')).toBe('AI suggestions');
    expect(unitOf('top1')).toBeNull();
    const p = new URLSearchParams(drillHref(base, { m: 'change', k: 'dose' }, 'x').split('?')[1]);
    expect(p.get('du')).toBe('medicines');
  });

  it('the queue reads only the drill from the URL (no other filter, tab All) and keeps it in its own URL', () => {
    const q = queueFromUrl('?tab=todo&dm=top1&dk=&dfx=urti&mismatch=ddx&reviewer=abc&dl=URTI');
    expect(q).toEqual({ tab: 'all', dm: 'top1', dfx: 'urti', dl: 'URTI' });
    expect(drillOf(q as Record<string, unknown>)).toEqual({ dm: 'top1', dfx: 'urti', dl: 'URTI' });
    expect(queueUrl('', q!, 'all')).toBe('?tab=all&dm=top1&dfx=urti&dl=URTI');
    expect(drillOf({ mismatch: 'ddx' })).toBeNull();
  });
});
