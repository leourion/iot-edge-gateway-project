'use client';

import type { TelemetryReading } from '@/features/dashboard/types';

interface ReadingsCardProps {
  readings: TelemetryReading[];
  deviceLabel?: string;
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

const RISK_LABEL: Record<string, string> = { normal: 'Normal', warning: 'Watch', critical: 'Alert', unavailable: 'N/A' };
const RISK_COLOR: Record<string, string> = { normal: '#4ade80', warning: '#facc15', critical: '#f87171', unavailable: '#8a8f98' };

/** Mirrors the static HTML's `.rhead`/`.rrow` table: last 8 readings, newest first. */
export function ReadingsCard({ readings, deviceLabel }: ReadingsCardProps) {
  const rows = [...readings].slice(-8).reverse();

  return (
    <div className="rounded-xl bg-white/[.03] p-[18px] pb-3">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[13px] font-medium text-white">Latest readings</span>
        {deviceLabel && <span className="ml-auto text-xs text-[#62666d]">{deviceLabel}</span>}
      </div>
      <div className="grid grid-cols-[72px_1fr_1fr_44px_60px] gap-2 px-1.5 pb-1.5 text-[11px] text-[#62666d]">
        <span>Time</span>
        <span>Temp</span>
        <span>Humidity</span>
        <span className="text-right" title="GPIO output reported by ESP32 #2; null means no recent feedback">Relay</span>
        <span className="text-right" title="Risk classification from the AI service">AI</span>
      </div>
      <div className="flex max-h-[260px] flex-col gap-0.5 overflow-y-auto">
        {rows.length === 0 ? (
          <div className="px-1.5 py-2.5 text-xs text-[#62666d]">Waiting for telemetry.</div>
        ) : (
          rows.map((r) => {
            const risk = r.ai.riskLevel;
            return (
              <div
                key={r.id}
                className="grid h-[34px] grid-cols-[72px_1fr_1fr_44px_60px] items-center gap-2 rounded-md px-1.5 text-xs hover:bg-white/[.03]"
              >
                <span className="text-[#62666d] tabular-nums">{timeLabel(r.observedAt)}</span>
                <span className="text-[#d0d6e0] tabular-nums">
                  {r.temperature.toFixed(1)}
                  <small className="text-[#8a8f98]">°C</small>
                </span>
                <span className="text-[#d0d6e0] tabular-nums">
                  {r.humidity.toFixed(0)}
                  <small className="text-[#8a8f98]">%</small>
                </span>
                <span className={`text-right text-[11px] font-medium ${r.relayActualStatus === 'ON' ? 'text-[#4ade80]' : r.relayActualStatus === 'OFF' ? 'text-[#8a8f98]' : 'text-[#facc15]'}`}>
                  {r.relayActualStatus ?? 'N/A'}
                </span>
                <span className="text-right text-[11px] font-medium" style={{ color: RISK_COLOR[risk] }}>
                  {RISK_LABEL[risk]}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
