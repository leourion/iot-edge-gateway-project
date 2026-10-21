'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TelemetryReading } from '@/features/dashboard/types';
import { Card } from '@/components/ui/card';

interface AnomalyChartProps {
  readings: TelemetryReading[];
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg bg-[#1b1c1e] px-2.5 py-2 text-xs text-[#d0d6e0] shadow-[0_4px_32px_rgba(8,9,10,.6),0_1px_3px_rgba(0,0,0,.35)]">
      <div className="mb-1 font-medium text-white">{label}</div>
      <div style={{ color: p.stroke ?? p.color }}>Baseline percentile rank: {p.value}/100</div>
    </div>
  );
}

/** Same manual grid trick as <TrendChart /> — recharts' CartesianGrid is
 * unreliable in this project's setup, so we draw fixed evenly-spaced lines
 * ourselves. Single Y axis here, so only the left label column is inset. */
function GridLines() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-[30px] right-2 top-2">
      {[0, 25, 50, 75, 100].map((pct) => (
        <div key={pct} className="absolute inset-x-0 border-t border-white/[.09]" style={{ top: `${pct}%` }} />
      ))}
    </div>
  );
}

/** Same dedicated time-label row as <TrendChart />, kept out of the plot's fixed height. */
function XLabels({ readings }: { readings: TelemetryReading[] }) {
  const n = readings.length;
  if (n === 0) return null;
  const step = Math.max(1, Math.ceil(n / 6));
  const labels: string[] = [];
  for (let i = 0; i < n; i += step) labels.push(timeLabel(readings[i].observedAt));
  return (
    <div className="flex justify-between px-0.5 pt-1.5 text-[11px] text-[#62666d]">
      {labels.map((l, i) => (
        <span key={i}>{l}</span>
      ))}
    </div>
  );
}

/**
 * Plots the model's empirical percentile rank (0..1) over time. It is not a
 * probability that the current reading is anomalous.
 * rather than a placeholder sensor.
 */
export function AnomalyChart({ readings }: AnomalyChartProps) {
  const modelVersion = [...readings].reverse().find((reading) => reading.ai.modelVersion)?.ai.modelVersion;
  const data = readings.map((r) => ({
    time: timeLabel(r.observedAt),
    score: Math.round(r.ai.anomalyScore * 100),
  }));

  return (
    <Card className="mb-4 rounded-xl border-0 bg-white/[.03] p-[18px] pb-3 text-[#d0d6e0] shadow-none">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[13px] font-medium text-white">AI anomaly percentile</span>
        <span className="text-xs text-[#62666d]">relative to baseline scores</span>
        <div className="ml-auto flex items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-xs text-[#8a8f98]">
            <i className="block h-[2.5px] w-2 rounded-sm bg-[#a78bfa]" />
            apps/ai-service · {modelVersion ?? 'model unavailable'}
          </span>
        </div>
      </div>
      <div className="relative h-[140px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#62666d]">AI score appears after telemetry arrives.</div>
        ) : <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} height={0} />
            <YAxis stroke="#62666d" fontSize={11} tickLine={false} axisLine={false} width={30} domain={[0, 100]} tickFormatter={(v) => `${v}`} />
            <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(255,255,255,.14)' }} />
            <Line
              dataKey="score"
              stroke="#a78bfa"
              strokeWidth={1.6}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>}
        {data.length > 0 && <GridLines />}
      </div>
      <XLabels readings={readings} />
    </Card>
  );
}
