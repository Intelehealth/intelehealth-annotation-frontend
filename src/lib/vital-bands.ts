/**
 * V10: colour-coded pulse, BP and BMI on the visit page. A straight port of the
 * KG repo's deterministic banding module (src/banding.py: age_band, pulse_band,
 * bp_band, adult_bmi_band / nutrition_band). NO new thresholds: change them there
 * first. Reference ranges are PENDING CLINICAL REVIEW (the page says so).
 *
 * Display-only extension: adds a hypotension band (SBP<90 / DBP<60) not present in banding.py;
 * pending clinical review. banding.py itself is NOT changed (it feeds the KG ranker and the DDx service).
 * Rule kept for every band: a value outside a modelled range never falls through to "Normal";
 * a missing or non-numeric value is "No reference".
 *
 * tone: 'normal' (neutral), 'out' (amber), 'critical' (red, only where the module
 * defines a critical band: BP crisis), 'none' (no reference: shown uncoloured).
 */
export type AgeBand = 'neonate' | 'infant' | 'child' | 'adolescent' | 'adult' | 'elderly';
export interface VitalBand { word: string; tone: 'normal' | 'out' | 'critical' | 'none' }

const NEONATE_MAX_YEARS = 28 / 365.25;

export function ageBand(ageYears: number): AgeBand {
  if (ageYears < NEONATE_MAX_YEARS) return 'neonate';
  if (ageYears < 1) return 'infant';
  if (ageYears < 10) return 'child';
  if (ageYears < 20) return 'adolescent';
  if (ageYears < 60) return 'adult';
  return 'elderly';
}

// normal [low, high] resting pulse by age band (banding.py _PULSE_NORMAL)
const PULSE_NORMAL: Record<AgeBand, [number, number]> = {
  neonate: [100, 180], infant: [100, 160], child: [70, 120], adolescent: [60, 100], adult: [60, 100], elderly: [60, 100],
};

export function pulseBand(bpm: number, ageYears: number | null | undefined): VitalBand {
  if (!Number.isFinite(bpm)) return { word: 'No reference', tone: 'none' };
  if (ageYears == null) return { word: 'no age: no reference', tone: 'none' };
  const [low, high] = PULSE_NORMAL[ageBand(ageYears)];
  if (bpm < low) return { word: 'Low', tone: 'out' };
  if (bpm > high) return { word: 'High', tone: 'out' };
  return { word: 'Normal', tone: 'normal' };
}

// Adult ACC/AHA staging; under 20 needs age / sex / height percentile tables, so it is not guessed.
export function bpBand(sbp: number, dbp: number, ageYears: number | null | undefined): VitalBand {
  if (!Number.isFinite(sbp) || !Number.isFinite(dbp)) return { word: 'No reference', tone: 'none' };
  if (ageYears == null) return { word: 'no age: no reference', tone: 'none' };
  if (ageYears < 20) return { word: 'child: no reference', tone: 'none' };
  // V10b (display-only, not in banding.py): hypotension is checked first so a low reading is never "Normal".
  if (sbp < 90 || dbp < 60) return { word: 'Low', tone: 'out' };
  if (sbp >= 180 || dbp >= 120) return { word: 'Crisis', tone: 'critical' };
  if (sbp >= 140 || dbp >= 90) return { word: 'Stage 2 high', tone: 'out' };
  if (sbp >= 130 || dbp >= 80) return { word: 'Stage 1 high', tone: 'out' };
  if (sbp >= 120) return { word: 'Elevated', tone: 'out' };
  return { word: 'Normal', tone: 'normal' };
}

// WHO adult BMI (age >= 20 only; under 20 the module uses MUAC / weight-for-height, never adult BMI).
export function bmiBand(bmi: number, ageYears: number | null | undefined): VitalBand {
  if (!Number.isFinite(bmi)) return { word: 'No reference', tone: 'none' };
  if (ageYears == null) return { word: 'no age: no reference', tone: 'none' };
  if (ageYears < 20) return { word: 'child: no reference', tone: 'none' };
  if (bmi < 18.5) return { word: 'Underweight', tone: 'out' };
  if (bmi < 25) return { word: 'Normal', tone: 'normal' };
  if (bmi < 30) return { word: 'Overweight', tone: 'out' };
  return { word: 'Obese', tone: 'out' };
}
