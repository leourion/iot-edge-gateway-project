'use client';

import dynamic from 'next/dynamic';

// Rendered fully on the client only. The mock telemetry generator uses
// Date.now() to build timestamps — running it during SSR and again on
// client hydration produced two different outputs (a hydration mismatch).
// Skipping SSR for this page avoids that entirely, which is safe since the
// page is a live/real-time view anyway (nothing here benefits from SSR).
const MonitorPage = dynamic(
  () => import('@/features/linear-monitor/components/MonitorPage').then((m) => m.MonitorPage),
  { ssr: false },
);

export default function Page() {
  return <MonitorPage />;
}
