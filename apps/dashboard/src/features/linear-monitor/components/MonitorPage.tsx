'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MetricTiles } from './MetricTiles';
import { TrendChart } from './TrendChart';
import { AnomalyChart } from './AnomalyChart';
import { SensorRows } from './SensorRows';
import { ReadingsCard } from './ReadingsCard';
import { AlertsCard } from './AlertsCard';
import { FanControl } from './FanControl';
import { useLiveOverview } from '../lib/use-live-overview';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/features/auth/AuthGate';

function useLastUpdatedLabel(lastUpdatedAt: number, connectionStatus: 'connecting' | 'live' | 'error') {
  const [label, setLabel] = useState('updated just now');
  useEffect(() => {
    if (connectionStatus === 'error') {
      setLabel('API unavailable');
      return;
    }
    if (connectionStatus === 'connecting') {
      setLabel('connecting to API');
      return;
    }
    setLabel('updated just now');
    const id = setInterval(() => {
      const secs = Math.round((Date.now() - lastUpdatedAt) / 1000);
      setLabel(secs < 2 ? 'updated just now' : `updated ${secs}s ago`);
    }, 1000);
    return () => clearInterval(id);
  }, [lastUpdatedAt, connectionStatus]);
  return label;
}

export function MonitorPage({ mockFallback = true }: { mockFallback?: boolean }) {
  const auth = useAuth();
  const { overview, isMock, connectionStatus, lastUpdatedAt, activeDeviceId, selectDevice, refresh } = useLiveOverview({ mockFallback });
  const [navOpen, setNavOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const lastUpdatedLabel = useLastUpdatedLabel(lastUpdatedAt, connectionStatus);

  const activeDevice = overview.devices.find((d) => d.id === activeDeviceId) ?? overview.devices[0];
  const readings = activeDevice
    ? overview.latestReadings.filter((reading) => reading.deviceId === activeDevice.id)
    : [];
  const latest = readings[readings.length - 1];

  return (
    <div className="fixed inset-0 flex bg-[#08090a] text-[13px] text-[#d0d6e0] antialiased">
      {!sidebarHidden && (
        <Sidebar
          open={navOpen}
          onClose={() => setNavOpen(false)}
          deviceCount={overview.summary.totalDevices}
          onlineDeviceCount={overview.summary.onlineDevices}
          alertCount={overview.summary.activeAlerts}
        />
      )}

      <main className={cn('m-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-[#0f1011]', sidebarHidden ? '' : 'md:ml-0')}>
        <Topbar
          username={auth?.username ?? ''}
          role={auth?.role ?? 'user'}
          devices={overview.devices}
          activeDeviceId={activeDevice?.id}
          onSelectDevice={selectDevice}
          isMock={isMock}
          connectionStatus={connectionStatus}
          lastUpdatedLabel={lastUpdatedLabel}
          onRefresh={refresh}
          onOpenNav={() => setNavOpen(true)}
          onToggleSidebar={() => setSidebarHidden((v) => !v)}
        />

        <div className="min-h-0 flex-1 overflow-y-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            id="overview"
            className={cn(
              'mx-auto px-6 pb-12 pt-1.5',
              sidebarHidden ? 'max-w-[1500px] lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-5' : 'max-w-[1040px]',
            )}
          >
            <div className="min-w-0">
              {connectionStatus === 'error' && !isMock && (
                <div className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-red-400/20 bg-red-400/[.06] px-4 py-3 text-sm text-[#d0d6e0]">
                  <span>Could not load live warehouse telemetry from the API.</span>
                  <Button variant="outline" size="sm" className="border-white/10 bg-white/[.05] text-white hover:bg-white/10" onClick={refresh}>
                    Retry
                  </Button>
                </div>
              )}
              <MetricTiles readings={readings} devices={overview.devices} />
              <TrendChart readings={readings} />
              <AnomalyChart readings={readings} />

              <Card id="sensors" className="mb-4 rounded-xl border-0 bg-white/[.03] p-[18px] pb-3 text-[#d0d6e0] shadow-none">
                <div className="mb-1 flex items-center gap-2.5">
                  <span className="text-[13px] font-medium text-white">Sensors on this device</span>
                  <span className="ml-auto text-xs text-[#62666d]">
                    {isMock ? 'Simulated' : connectionStatus === 'live' ? 'Live API' : 'No live connection'} · {readings.length} readings buffered
                  </span>
                </div>
                <p className="mb-2 px-1.5 text-[11px] text-[#62666d]">Fan ON at ≥30°C or ≥75% RH · OFF only at ≤28°C and ≤70% RH.</p>
              <FanControl deviceId={activeDevice?.id} online={activeDevice?.status === 'ONLINE'} isMock={isMock} canControl={auth?.role === 'admin'} />
                <SensorRows device={activeDevice} latest={latest} />
              </Card>

              {!sidebarHidden && (
                <div className="mb-4 grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                  <div id="readings"><ReadingsCard readings={readings} deviceLabel={activeDevice?.name} /></div>
                  <div id="alerts"><AlertsCard alerts={overview.latestAlerts} devices={overview.devices} /></div>
                </div>
              )}
            </div>

            {sidebarHidden && (
              <div className="flex flex-col gap-4 lg:sticky lg:top-1.5">
                <div id="readings"><ReadingsCard readings={readings} deviceLabel={activeDevice?.name} /></div>
                <div id="alerts"><AlertsCard alerts={overview.latestAlerts} devices={overview.devices} /></div>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
}
