/**
 * D5 / P7: the Overview trend is daily, or weekly sums when the median active day has
 * fewer than 20 visits. A short range (14 active days or fewer, e.g. the default
 * Last 7 days) always stays daily, so it never collapses to one or two weekly points.
 */
export const WEEKLY_MEDIAN_BELOW = 20;
export const DAILY_UP_TO_DAYS = 14;

export function trendWeekly(visitsPerActiveDay: number[]): boolean {
  if (visitsPerActiveDay.length <= DAILY_UP_TO_DAYS) return false;
  const sorted = [...visitsPerActiveDay].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] < WEEKLY_MEDIAN_BELOW;
}
