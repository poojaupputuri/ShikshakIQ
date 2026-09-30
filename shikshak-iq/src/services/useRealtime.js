import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useRealtime — keeps data fresh with configurable polling.
 *
 * @param {Function} fetcher  Async function returning the data.
 * @param {Object}   opts
 * @param {number}   [opts.interval=30_000]  Poll interval in ms.
 * @param {boolean}  [opts.enabled=true]     Whether polling is active.
 * @param {Array}    [opts.deps=[]]          Re-fetch + restart timer when these change.
 * @param {boolean}  [opts.immediate=true]   Fetch immediately on mount.
 * @returns {{ data, loading, error, refresh, isLive, lastUpdated }}
 */
export default function useRealtime(fetcher, opts = {}) {
  const {
    interval = 30_000,
    enabled = true,
    deps = [],
    immediate = true,
  } = opts;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setError(null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err?.response?.data?.error || err.message || 'Fetch failed');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    if (immediate && enabled) {
      fetchData();
    }
    return () => { mountedRef.current = false; };
  }, [fetchData]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling
  useEffect(() => {
    if (!enabled || interval <= 0) return;

    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, interval, fetchData]);

  // Manual refresh exposed to consumers
  const refresh = useCallback(() => {
    setLoading(true);
    fetchData();
  }, [fetchData]);

  const isLive = enabled && interval > 0;

  return { data, loading, error, refresh, isLive, lastUpdated };
}
