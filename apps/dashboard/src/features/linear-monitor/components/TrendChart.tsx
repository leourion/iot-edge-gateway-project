'use client';

import { Area, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { TelemetryReading } from '@/features/dashboard/types';
import { Card } from '@/components/ui/card';

interface TrendChartProps {
  readings: TelemetryReading[];
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

function DarkTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  // Temperature is drawn twice (an Area fill and a Line), but should appear
  // only once in the tooltip. The Map keeps the later Line payload for color.
  const points = [...new Map(payload.map((point: any) => [point.dataKey, point])).values()];
  return (
    <div className="rounded-lg bg-[#1b1c1e] px-2.5 py-2 text-xs text-[#d0d6e0] shadow-[0_4px_32px_rgba(8,9,10,.6),0_1px_3px_rgba(0,0,0,.35)]">
      <div className="mb-1 font-medium text-white">{label}</div>
      {points.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.stroke ?? p.color }}>
          {p.name}: {p.value}
          {p.dataKey === 'temperature' ? '°C' : '%'}
        </div>
      ))}
    </div>
  );
}

/**
 * Fixed, evenly-spaced horizontal reference lines drawn independently of
 * recharts' own CartesianGrid. With two YAxis scales on one chart,
 * CartesianGrid reliably fails to render horizontal lines here (a known
 * recharts limitation), so we draw them ourselves the same way the original
 * static mock did — 5 lines evenly spaced across the plot height, not tied
 * to actual tick values, painted on top of the area fill so they stay
 * crisp and visible.
 */
function GridLines() {
  return (
    <div className="pointer-events-none absolute bottom-0 left-[30px] right-[44px] top-2">
      {[0, 25, 50, 75, 100].map((pct) => (
        <div key={pct} className="absolute inset-x-0 border-t border-white/[.09]" style={{ top: `${pct}%` }} />
      ))}
    </div>
  );
}

/**
 * Time labels rendered in their own row below the plot, exactly like the
 * static HTML mock (a dedicated `.xlabels` div) — instead of letting
 * recharts squeeze XAxis tick text inside the fixed-height plot area, which
 * shrinks the actual line/grid region and makes the card shorter than the
 * reference design.
 */
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

export function TrendChart({ readings }: TrendChartProps) {
  const data = readings.map((r) => ({
    time: timeLabel(r.observedAt),
    temperature: r.temperature,
    humidity: r.humidity,
  }));

  return (
    <Card className="mb-4 rounded-xl border-0 bg-white/[.03] p-[18px] pb-3 text-[#d0d6e0] shadow-none">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[13px] font-medium text-white">Temperature &amp; humidity</span>
        <span className="text-xs text-[#62666d]">— live, updates every 3s</span>
        <div className="ml-auto flex items-center gap-3.5">
          <span className="flex items-center gap-1.5 text-xs text-[#8a8f98]">
            <i className="block h-[2.5px] w-2 rounded-sm bg-[#f2994a]" />
            Temperature (°C)
          </span>
          <span className="flex items-center gap-1.5 text-xs text-[#8a8f98]">
            <i className="block h-[2.5px] w-2 rounded-sm bg-[#38bdf8]" />
            Humidity (%)
          </span>
        </div>
      </div>
      <div className="relative h-[220px]">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[#62666d]">
            Chart appears after telemetry arrives.
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="tempFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f2994a" stopOpacity={0.12} />
                    <stop offset="100%" stopColor="#f2994a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {/* XAxis kept for the tooltip's x-position tracking, but its own
                    tick labels are hidden — <XLabels> below renders them
                    instead, in a separate row, matching the reference layout. */}
                <XAxis dataKey="time" tick={false} axisLine={false} tickLine={false} height={0} />
                <YAxis
                  yAxisId="temp"
                  stroke="#62666d"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={30}
                  domain={['dataMin - 1', 'dataMax + 1']}
                  tickFormatter={(v) => `${Math.round(v)}°`}
                />
                <YAxis
                  yAxisId="hum"
                  orientation="right"
                  stroke="#62666d"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                  domain={['dataMin - 2', 'dataMax + 2']}
                  tickFormatter={(v) => `${Math.round(v)}%`}
                />
                <Tooltip content={<DarkTooltip />} cursor={{ stroke: 'rgba(255,255,255,.14)' }} />
                <Area
                  yAxisId="temp"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="none"
                  fill="url(#tempFill)"
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="temp"
                  dataKey="temperature"
                  name="Temperature"
                  stroke="#f2994a"
                  strokeWidth={1.6}
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />
                <Line
                  yAxisId="hum"
                  dataKey="humidity"
                  name="Humidity"
                  stroke="#38bdf8"
                  strokeWidth={1.6}
                  strokeDasharray="3 3"
                  dot={false}
                  activeDot={{ r: 3 }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <GridLines />
          </>
        )}
      </div>
      <XLabels readings={readings} />
    </Card>
  );
}
