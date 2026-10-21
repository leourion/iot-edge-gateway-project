'use client';

import dynamic from 'next/dynamic';

// Keep charts and relative-time labels on the client, and use API-only data here.
const MonitorPage = dynamic(
  () => import('@/features/linear-monitor/components/MonitorPage').then((module) => module.MonitorPage),
  { ssr: false },
);

export default function DashboardRoute() {
  return <MonitorPage mockFallback={false} />;
}
