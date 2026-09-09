'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { dashboardDataAPI, AdminOverview } from '@/lib/api/dashboard-data';

// Loads the admin overview once, exposes a manual refresh, and refreshes on a
// timer while the tab is visible. No polling in the background.
export function useAdminOverview(intervalMs = 60_000) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!silent) setRefreshing(true);
    try {
      setData(await dashboardDataAPI.adminOverview());
      setUpdatedAt(new Date());
      setError(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      setError(err?.response?.data?.message ?? err?.message ?? 'Failed to load the dashboard');
    } finally {
      inFlight.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [load, intervalMs]);

  return { data, error, loading, refreshing, updatedAt, refresh: () => load(false) };
}
