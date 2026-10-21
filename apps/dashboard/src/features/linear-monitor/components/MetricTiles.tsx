'use client';

import { Thermometer, Droplets, ScanSearch } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Device, TelemetryReading } from '@/features/dashboard/types';
import { Sparkline } from './Sparkline';
import { DevicesCard } from './DevicesCard';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

interface MetricTilesProps {
  readings: TelemetryReading[];
  devices: Device[];
}

function delta(readings: TelemetryReading[], key: 'temperature' | 'humidity', back = 10) {
  if (readings.length < 2) return 0;
  const now = readings[readings.length - 1][key];
  const before = readings[Math.max(0, readings.length - 1 - back)][key];
  return now - before;
}

function Tile({
  icon,
  label,
  value,
  unit,
  deltaValue,
  deltaLabel,
  note,
  spark,
  sparkColor,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
  deltaValue?: number;
  deltaLabel?: string;
  note?: string;
  spark?: number[];
  sparkColor?: string;
}) {
  const up = (deltaValue ?? 0) > 0.2;
  const down = (deltaValue ?? 0) < -0.2;
  return (
    <Card className="relative overflow-hidden rounded-[10px] border-0 bg-white/[.035] px-4 py-3.5 text-[#d0d6e0] shadow-none">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs text-[#8a8f98]">
        {icon}
        {label}
      </div>
      <div className="text-[26px] font-semibold tracking-tight text-white tabular-nums">
        {value}
        <small className="ml-0.5 text-[13px] font-normal text-[#8a8f98]">{unit}</small>
      </div>
      {deltaLabel && (
        <div
          className={cn(
            'mt-1.5 inline-flex items-center gap-1 text-xs',
            // Exact reference hex: up=#f2994a (temperature amber), down=#38bdf8
            // (Tailwind's sky-400 happens to match exactly; orange-400 does not
            // match #f2994a, so that one is hardcoded).
            up && 'text-[#f2994a]',
            down && 'text-sky-400',
            !up && !down && 'text-[#8a8f98]',
          )}
        >
          {up ? '↑' : down ? '↓' : '–'} {deltaLabel}
        </div>
      )}
      {note && <p title={note} className="mt-1.5 truncate whitespace-nowrap text-[10px] leading-snug text-[#62666d]">{note}</p>}
      {spark && sparkColor && <Sparkline data={spark} color={sparkColor} />}
    </Card>
  );
}

export function MetricTiles({ readings, devices }: MetricTilesProps) {
  const last = readings[readings.length - 1];
  const dTemp = readings.length > 1 ? delta(readings, 'temperature') : undefined;
  const dHum = readings.length > 1 ? delta(readings, 'humidity') : undefined;

  return (
    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Tile
        icon={<Thermometer size={13} />}
        label="Temperature"
        value={last ? last.temperature.toFixed(1) : '–'}
        unit="°C"
        deltaValue={dTemp}
        deltaLabel={dTemp == null ? undefined : `${Math.abs(dTemp).toFixed(1)}° vs 10 readings earlier`}
        spark={readings.slice(-24).map((r) => r.temperature)}
        sparkColor="#f2994a"
      />
      <Tile
        icon={<Droplets size={13} />}
        label="Humidity"
        value={last ? last.humidity.toFixed(0) : '–'}
        unit="%"
        deltaValue={dHum}
        deltaLabel={dHum == null ? undefined : `${Math.abs(dHum).toFixed(0)}% vs 10 readings earlier`}
        spark={readings.slice(-24).map((r) => r.humidity)}
        sparkColor="#38bdf8"
      />
      <Tile
        icon={<ScanSearch size={13} />}
        label="AI anomaly percentile"
        value={last ? `${Math.round(last.ai.anomalyScore * 100)}` : '–'}
        unit="pct."
        note={last ? `Risk: ${last.ai.riskLevel} · baseline percentile` : 'AI score unavailable'}
        spark={readings.slice(-24).map((reading) => reading.ai.anomalyScore * 100)}
        sparkColor="#a78bfa"
      />
      <DevicesCard devices={devices} readings={readings} compact />
    </div>
  );
}
