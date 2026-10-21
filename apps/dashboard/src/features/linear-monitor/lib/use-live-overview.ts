'use client';

import { useEffect, useRef, useState } from 'react';
import type { DashboardOverview } from '@/features/dashboard/types';
import { getDashboardOverview } from '@/features/dashboard/services/dashboard-api';
import { generateMockOverview, getDeviceHistory, MOCK_TICK_INTERVAL_MS, tickDeviceHistory } from './mock';

const EMPTY_OVERVIEW: DashboardOverview = {
  summary: { totalDevices: 0, onlineDevices: 0, activeAlerts: 0 },
  devices: [],
  latestReadings: [],
  latestAlerts: [],
};

interface LiveOverviewState {
  overview: DashboardOverview;
  /** true while we're showing generated data because the real API had nothing yet */
  isMock: boolean;
  connectionStatus: 'connecting' | 'live' | 'error';
  lastUpdatedAt: number;
  activeDeviceId: string | undefined;
  selectDevice: (id: string) => void;
  refresh: () => void;
}

/**
 * Feeds <MonitorPage /> with a DashboardOverview.
 *
 * It always tries the real endpoint (apps/api -> GET /dashboard/overview)
 * first. Once that route is returning live MQTT-ingested readings, this hook
 * picks them up automatically. Mock fallback can be disabled for routes that
 * must never show generated readings as though they were hardware telemetry.
 */
export function useLiveOverview({ mockFallback = true }: { mockFallback?: boolean } = {}): LiveOverviewState {
  const [overview, setOverview] = useState<DashboardOverview>(() => mockFallback ? generateMockOverview() : EMPTY_OVERVIEW);
  const [isMock, setIsMock] = useState(mockFallback);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const [activeDeviceId, setActiveDeviceId] = useState<string | undefined>(
    () => mockFallback ? overview.devices[0]?.id : undefined,
  );
  const activeDeviceRef = useRef(activeDeviceId);
  activeDeviceRef.current = activeDeviceId;

  async function loadReal() {
    try {
      const real = await getDashboardOverview();
      if (mockFallback && real.latestReadings.length === 0) {
        setConnectionStatus('live');
        setLastUpdatedAt(Date.now());
        return false;
      }
      setOverview({
        ...real,
        latestReadings: [...real.latestReadings].reverse(),
      });
      setIsMock(false);
      setConnectionStatus('live');
      setActiveDeviceId((current) => real.devices.some((device) => device.id === current)
        ? current
        : real.devices[0]?.id);
      setLastUpdatedAt(Date.now());
      return true;
    } catch {
      setConnectionStatus('error');
    }
    return false;
  }

  function tickMock() {
    const deviceId = activeDeviceRef.current;
    if (!deviceId) return;
    const readings = tickDeviceHistory(deviceId);
    setOverview((prev) => ({ ...prev, latestReadings: readings }));
    setLastUpdatedAt(Date.now());
  }

  useEffect(() => {
    let cancelled = false;

    loadReal();

    const poll = setInterval(async () => {
      if (cancelled) return;
      const gotReal = await loadReal();
      if (!gotReal && mockFallback) tickMock();
    }, MOCK_TICK_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockFallback]);

  function selectDevice(id: string) {
    setActiveDeviceId(id);
    if (isMock && mockFallback) {
      setOverview((prev) => ({ ...prev, latestReadings: getDeviceHistory(id) }));
    }
  }

  function refresh() {
    loadReal().then((gotReal) => {
      if (!gotReal && mockFallback) tickMock();
    });
  }

  return { overview, isMock, connectionStatus, lastUpdatedAt, activeDeviceId, selectDevice, refresh };
}
