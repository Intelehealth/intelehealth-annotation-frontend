'use client';

import { useState, useEffect, useCallback } from 'react';
import { consensusAPI, ReliabilityMetricMeta } from '@/lib/api/consensus';

const STORAGE_KEY = 'consensus.reliabilityMetric';

/**
 * Shared selection state for the inter-rater reliability metric
 * (Total Agreement % / Fleiss' κ / Krippendorff's α).
 *
 * Fetches the backend catalog once, seeds the selection from localStorage
 * (falling back to the backend default), and persists changes so the choice
 * survives reloads. `metric` is '' until the catalog resolves — callers should
 * wait for a non-empty value before fetching metric-dependent data.
 */
export function useReliabilityMetric() {
  const [catalog, setCatalog] = useState<ReliabilityMetricMeta[]>([]);
  const [metric, setMetricState] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    consensusAPI
      .getMetricsCatalog()
      .then((c) => {
        if (!mounted) return;
        const metrics = c.metrics || [];
        setCatalog(metrics);
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
        const valid = stored && metrics.some((m) => m.key === stored);
        setMetricState(valid ? (stored as string) : c.default);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const setMetric = useCallback((key: string) => {
    setMetricState(key);
    try {
      localStorage.setItem(STORAGE_KEY, key);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
  }, []);

  return { catalog, metric, setMetric };
}
