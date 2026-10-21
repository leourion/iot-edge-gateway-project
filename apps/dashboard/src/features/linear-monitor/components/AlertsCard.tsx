'use client';

import type { Alert, Device } from '@/features/dashboard/types';
import { ago } from '../lib/time';

interface AlertsCardProps {
  alerts: Alert[];
  devices: Device[];
}

/** Recent rule-generated alerts; the API currently exposes latest events, not open/closed state. */
export function AlertsCard({ alerts, devices }: AlertsCardProps) {
  const deviceName = (id: string) => devices.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="rounded-xl bg-white/[.03] p-[18px] pb-3">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[13px] font-medium text-white">Alerts</span>
        <span className="ml-auto text-xs text-[#62666d]">{alerts.length} recent</span>
      </div>
      <div className="flex flex-col gap-0.5">
        {alerts.length === 0 ? (
          <div className="px-1.5 py-2.5 text-xs text-[#62666d]">No recent rule alerts.</div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5 rounded-lg px-1.5 py-2 hover:bg-white/[.03]">
              <span
                className="mt-[5px] h-2 w-2 flex-none rounded-full"
                style={{ background: a.severity === 'CRITICAL' ? '#f87171' : '#facc15' }}
              />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] leading-snug text-[#d0d6e0]">{a.message}</div>
                <div className="mt-0.5 text-[11px] text-[#62666d]">
                  {deviceName(a.deviceId)} · {ago(a.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
