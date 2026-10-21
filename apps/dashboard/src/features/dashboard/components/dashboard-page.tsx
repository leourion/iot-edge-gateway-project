import { Activity, RefreshCcw } from 'lucide-react';
import Link from 'next/link';
import { MetricCard } from '@/components/ui/metric-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertList } from './alert-list';
import { DeviceList } from './device-list';
import { ReadingList } from './reading-list';
import { TelemetryChart } from './telemetry-chart';
import { getDashboardOverview } from '../services/dashboard-api';
import type { DashboardOverview } from '../types';

const emptyOverview: DashboardOverview = {
  summary: {
    totalDevices: 0,
    onlineDevices: 0,
    activeAlerts: 0,
  },
  devices: [],
  latestReadings: [],
  latestAlerts: [],
};

export const dynamic = 'force-dynamic';

export async function DashboardPage() {
  const overview = await getDashboardOverview().catch(() => emptyOverview);

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <header className="mx-auto mb-6 flex max-w-6xl flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-normal">IoT Environment Monitor</h1>
          <p className="mt-2 text-muted-foreground">ESP32 telemetry, relay state, and environment alerts.</p>
        </div>
        <Button asChild>
          <Link href="/">
            <RefreshCcw size={16} />
            Refresh
          </Link>
        </Button>
      </header>

      <div className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-3">
        <MetricCard label="Total devices" value={overview.summary.totalDevices} />
        <MetricCard label="Online devices" value={overview.summary.onlineDevices} />
        <MetricCard label="Recent alerts" value={overview.summary.activeAlerts} />

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>System state</CardTitle>
          </CardHeader>
          <CardContent>
          <div className="flex items-center justify-between gap-3">
            <div>
              <strong>MQTT ingestion</strong>
              <div className="text-sm text-muted-foreground">Telemetry topic: iot/devices/+/telemetry</div>
            </div>
            <Badge variant="success">
              <Activity size={12} /> READY
            </Badge>
          </div>
          </CardContent>
        </Card>

        <TelemetryChart readings={overview.latestReadings} />

        <div className="grid gap-4 lg:col-span-3 lg:grid-cols-2">
          <DeviceList devices={overview.devices} />
          <ReadingList readings={overview.latestReadings} />
        </div>
        <AlertList alerts={overview.latestAlerts} />
      </div>
    </main>
  );
}
