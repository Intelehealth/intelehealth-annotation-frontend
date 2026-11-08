import { describe, expect, it } from 'vitest';
import { ageBand, bmiBand, bpBand, pulseBand } from './vital-bands';

// Mirrors src/banding.py in the KG repo (age_band, pulse_band, bp_band, adult_bmi_band).
describe('vital bands (V10)', () => {
  it('age bands', () => {
    expect([0.01, 0.5, 5, 15, 36, 72].map(ageBand)).toEqual(['neonate', 'infant', 'child', 'adolescent', 'adult', 'elderly']);
    expect(ageBand(19.9)).toBe('adolescent');
    expect(ageBand(20)).toBe('adult');
  });
  it('pulse is age-aware, normal inclusive at the edges', () => {
    expect(pulseBand(95, 50)).toEqual({ word: 'Normal', tone: 'normal' });
    expect(pulseBand(100, 50).word).toBe('Normal');
    expect(pulseBand(101, 50)).toEqual({ word: 'High', tone: 'out' });
    expect(pulseBand(59, 70)).toEqual({ word: 'Low', tone: 'out' });
    expect(pulseBand(115, 5).word).toBe('Normal'); // child 70-120
    expect(pulseBand(150, 0.5).word).toBe('Normal'); // infant 100-160
    expect(pulseBand(165, 0.5).word).toBe('High');
    expect(pulseBand(90, 0.01).word).toBe('Low'); // neonate 100-180
    expect(pulseBand(80, null).tone).toBe('none');
  });
  it('BP: adult staging, crisis is the only critical band, under 20 not guessed', () => {
    expect(bpBand(118, 62, 58)).toEqual({ word: 'Normal', tone: 'normal' });
    expect(bpBand(122, 70, 58).word).toBe('Elevated');
    expect(bpBand(119, 80, 58).word).toBe('Stage 1 high');
    expect(bpBand(145, 85, 58).word).toBe('Stage 2 high');
    expect(bpBand(185, 100, 58)).toEqual({ word: 'Crisis', tone: 'critical' });
    expect(bpBand(150, 95, 12)).toEqual({ word: 'child: no reference', tone: 'none' });
    expect(bpBand(150, 95, 19).tone).toBe('none');
  });
  it('BMI: WHO adult bands from 20 years', () => {
    expect(bmiBand(17.54, 50)).toEqual({ word: 'Underweight', tone: 'out' });
    expect(bmiBand(18.5, 50).word).toBe('Normal');
    expect(bmiBand(25, 50).word).toBe('Overweight');
    expect(bmiBand(30, 50).word).toBe('Obese');
    expect(bmiBand(15, 10)).toEqual({ word: 'child: no reference', tone: 'none' });
  });
});

describe('V10b: no one-sided gaps', () => {
  it('adult hypotension is Low, checked before the other bands', () => {
    expect(bpBand(85, 55, 40)).toEqual({ word: 'Low', tone: 'out' });
    expect(bpBand(118, 58, 40)).toEqual({ word: 'Low diastolic', tone: 'out' });
    expect(bpBand(119, 78, 40)).toEqual({ word: 'Normal', tone: 'normal' });
    expect(bpBand(85, 55, 8)).toEqual({ word: 'child: no reference', tone: 'none' });
  });
  it('non-numeric values are No reference, never Normal', () => {
    expect(bpBand(NaN, 70, 40).tone).toBe('none');
    expect(pulseBand(NaN, 40).tone).toBe('none');
    expect(bmiBand(NaN, 40).tone).toBe('none');
  });
});

describe('mixed BP: a Low component is never hidden', () => {
  it('names both components when one is Low and the other high', () => {
    expect(bpBand(125, 43, 48)).toEqual({ word: 'Low diastolic · Elevated systolic', tone: 'out' });
    expect(bpBand(89, 81, 36)).toEqual({ word: 'Low systolic · Stage 1 diastolic', tone: 'out' });
    expect(bpBand(85, 55, 40)).toEqual({ word: 'Low', tone: 'out' });
    expect(bpBand(185, 55, 40)).toEqual({ word: 'Low diastolic · Crisis systolic', tone: 'critical' });
    expect(bpBand(135, 95, 40).word).toBe('Stage 2 high');
  });
});
