'use client';

import type { Device, TelemetryReading } from '@/features/dashboard/types';
import { STATUS_LABEL, STATUS_TEXT_CLASS, THRESHOLDS, statusFor, type ThresholdKey } from '../lib/thresholds';
import { cn } from '@/lib/utils';

interface SensorRowsProps {
  device: Device | undefined;
  latest: TelemetryReading | undefined;
}

function pct(value: number, min: number, max: number) {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}

// Reserve a readable label column and keep long sensor descriptions on one line.
const ROW_GRID = 'grid-cols-[12px_minmax(0,1fr)_minmax(64px,1.5fr)_auto_54px] sm:grid-cols-[12px_minmax(150px,190px)_minmax(70px,1fr)_auto_54px]';
const ROW_GRID_STATUS = 'grid-cols-[12px_minmax(0,1fr)_minmax(64px,1.5fr)_auto] sm:grid-cols-[12px_minmax(150px,190px)_minmax(70px,1fr)_auto]';

function ThresholdRow({
  name,
  sub,
  color,
  thresholdKey,
  value,
  display,
}: {
  name: string;
  sub: string;
  color: string;
  thresholdKey: ThresholdKey;
  value: number;
  display: string;
}) {
  const t = THRESHOLDS[thresholdKey];
  const status = statusFor(thresholdKey, value);
  const zones = [
    { from: t.min, to: t.warnLo, color: 'rgba(248,113,113,.35)' },
    { from: t.warnLo, to: t.okLo, color: 'rgba(250,204,21,.3)' },
    { from: t.okLo, to: t.okHi, color: 'rgba(74,222,128,.28)' },
    { from: t.okHi, to: t.warnHi, color: 'rgba(250,204,21,.3)' },
    { from: t.warnHi, to: t.max, color: 'rgba(248,113,113,.35)' },
  ].filter((z) => z.to > z.from);

  return (
    <div className={cn('grid h-[42px] items-center gap-2.5 rounded-lg px-1.5 hover:bg-white/[.03]', ROW_GRID)}>
      <span className="h-2 w-2 justify-self-center rounded-full" style={{ background: color }} />
      <span className="flex min-w-0 flex-col overflow-hidden text-[13px] font-medium leading-tight text-[#d0d6e0]">
        <span className="truncate">{name}</span>
        <small className="truncate text-[11px] font-normal text-[#62666d]" title={sub}>{sub}</small>
      </span>
      <span className="relative h-1.5 rounded-[3px] bg-white/[.06]">
        {zones.map((z, i) => (
          <span
            key={i}
            className="absolute inset-y-0 rounded-[3px]"
            style={{ left: `${pct(z.from, t.min, t.max)}%`, width: `${pct(z.to, t.min, t.max) - pct(z.from, t.min, t.max)}%`, background: z.color }}
          />
        ))}
        <span
          className="absolute -top-[3px] h-3 w-[2px] rounded-[1px] bg-white"
          style={{ left: `${pct(value, t.min, t.max)}%` }}
        />
      </span>
      <span className="text-right text-[13px] font-medium tabular-nums text-white">
        {display}
        <small className="ml-0.5 font-normal text-[#8a8f98]">{t.unit}</small>
      </span>
      <span className={cn('text-right text-[11px] font-medium', STATUS_TEXT_CLASS[status])}>
        {STATUS_LABEL[status]}
      </span>
    </div>
  );
}

function StatusRow({
  name,
  sub,
  color,
  display,
  status,
}: {
  name: string;
  sub: string;
  color: string;
  display: string;
  status: 'ok' | 'warn' | 'crit';
}) {
  return (
    <div className={cn('grid h-[42px] items-center gap-2.5 rounded-lg px-1.5 hover:bg-white/[.03]', ROW_GRID_STATUS)}>
      <span className="h-2 w-2 justify-self-center rounded-full" style={{ background: color }} />
      <span className="flex min-w-0 flex-col overflow-hidden text-[13px] font-medium leading-tight text-[#d0d6e0]">
        <span className="truncate">{name}</span>
        <small className="truncate text-[11px] font-normal text-[#62666d]" title={sub}>{sub}</small>
      </span>
      <span />
      <span className={cn('text-right text-[13px] font-medium', STATUS_TEXT_CLASS[status])}>{display}</span>
    </div>
  );
}

export function SensorRows({ device, latest }: SensorRowsProps) {
  if (!latest || !device) {
    return <div className="py-6 text-center text-sm text-[#62666d]">No telemetry yet for this device.</div>;
  }

  const anomalyPercentile = Math.round(latest.ai.anomalyScore * 100);
  const aiStatus = latest.ai.riskLevel === 'critical' ? 'crit' : latest.ai.riskLevel === 'warning' || latest.ai.riskLevel === 'unavailable' ? 'warn' : 'ok';

  return (
    <div className="flex flex-col gap-0.5">
      <ThresholdRow
        name="Temperature"
        sub="DHT11 · GPIO4"
        color="#f2994a"
        thresholdKey="temperature"
        value={latest.temperature}
        display={latest.temperature.toFixed(1)}
      />
      <ThresholdRow
        name="Humidity"
        sub="DHT11 · GPIO4"
        color="#38bdf8"
        thresholdKey="humidity"
        value={latest.humidity}
        display={latest.humidity.toFixed(0)}
      />
      <StatusRow
        name="AI anomaly percentile"
        sub={latest.ai.modelVersion ?? 'AI model unavailable'}
        color="#a78bfa"
        display={latest.ai.riskLevel === 'unavailable' ? 'Unavailable' : `${anomalyPercentile}th · ${latest.ai.riskLevel}`}
        status={aiStatus}
      />
      <StatusRow
        name="Rain sensor"
        sub="Digital output · GPIO5"
        color={latest.waterDetected ? '#f87171' : '#4ade80'}
        display={latest.waterDetected ? 'Detected' : 'Dry'}
        status={latest.waterDetected ? 'crit' : 'ok'}
      />
      <StatusRow
        name="Fan command"
        sub="Calculated by ESP32 #1"
        color={latest.relayStatus === 'ON' ? '#4ade80' : '#62666d'}
        display={latest.relayStatus}
        status="ok"
      />
      <StatusRow
        name="Relay node output"
        sub="GPIO4 reported by ESP32 #2 · no contact sensor"
        color={latest.relayActualStatus === 'ON' ? '#4ade80' : latest.relayActualStatus === 'OFF' ? '#62666d' : '#facc15'}
        display={latest.relayActualStatus ?? 'Unknown'}
        status={latest.relayActualStatus ? 'ok' : 'warn'}
      />
      <StatusRow
        name="Device link"
        sub={device.lastSeenAt ? `Last seen ${new Date(device.lastSeenAt).toLocaleTimeString()}` : 'No data yet'}
        color={device.status === 'ONLINE' ? '#4ade80' : '#f87171'}
        display={device.status === 'ONLINE' ? 'Online' : 'Offline'}
        status={device.status === 'ONLINE' ? 'ok' : 'crit'}
      />
    </div>
  );
}
