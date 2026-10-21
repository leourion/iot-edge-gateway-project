'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TelemetryReading } from '../types';

interface TelemetryChartProps {
  readings: TelemetryReading[];
}

export function TelemetryChart({ readings }: TelemetryChartProps) {
  const chartData = readings
    .slice()
    .reverse()
    .map((reading) => ({
      time: new Date(reading.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      temperature: reading.temperature,
      humidity: reading.humidity,
    }));

  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Telemetry trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Chart appears after telemetry arrives.
            </div>
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="time" fontSize={12} tickLine={false} />
                <YAxis fontSize={12} tickLine={false} width={35} />
                <Tooltip />
                <Line dataKey="temperature" name="Temperature" stroke="#176b87" strokeWidth={2} type="monotone" />
                <Line dataKey="humidity" name="Humidity" stroke="#ad6b00" strokeWidth={2} type="monotone" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
