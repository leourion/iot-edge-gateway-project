'use client';

import type { Device, TelemetryReading } from '@/features/dashboard/types';
import { ago } from '../lib/time';

interface DevicesCardProps {
  devices: Device[];
  readings: TelemetryReading[];
  compact?: boolean;
}

/** Mirrors the static HTML's `.drow` list exactly: dot · name/location · live values · last-seen. */
export function DevicesCard({ devices, readings, compact = false }: DevicesCardProps) {
  const onlineCount = devices.filter((device) => device.status === 'ONLINE').length;
  const latestReadingByDevice = new Map<string, TelemetryReading>();
  for (const reading of readings) latestReadingByDevice.set(reading.deviceId, reading);
  return (
    <div id="devices" className="h-full rounded-xl bg-white/[.03] p-[18px] pb-3">
      <div className="mb-1 flex items-center gap-2.5">
        <span className="text-[13px] font-medium text-white">Devices</span>
        <span className="ml-auto text-xs text-[#62666d]">{onlineCount} online · {devices.length} total</span>
      </div>
      <div className="flex flex-col">
        {devices.length === 0 ? (
          <div className="px-1.5 py-2.5 text-xs text-[#62666d]">No device data yet.</div>
        ) : (
          devices.map((d) => {
            const online = d.status === 'ONLINE';
            const relayOutput = latestReadingByDevice.get(d.id)?.relayActualStatus;
            const [name, ...rest] = d.name.split(' · ');
            const location = rest.join(' · ');
            if (compact) {
              return (
                <div key={d.id} className="flex min-h-[52px] flex-col justify-center gap-1 rounded-lg px-1.5 py-1 hover:bg-white/[.03]">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 flex-none rounded-full" style={{ background: online ? '#22c55e' : '#383b3f' }} />
                    <b className="min-w-0 flex-1 truncate text-[12px] font-medium text-[#d0d6e0]" title={d.name}>{name}</b>
                    <span className={`flex-none text-[10px] ${online ? 'text-[#4ade80]' : 'text-[#8a8f98]'}`}>{online ? 'Online' : 'Offline'}</span>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 pl-4 text-[10px] tabular-nums text-[#8a8f98]">
                    <span className="min-w-0 flex-1 truncate">
                      {online && d.latestTemperature != null && d.latestHumidity != null
                        ? `${d.latestTemperature.toFixed(1)}°C · ${d.latestHumidity.toFixed(0)}% RH`
                        : d.lastSeenAt ? ago(d.lastSeenAt) : 'No data'}
                    </span>
                    <span className={`flex-none font-medium ${relayOutput === 'ON' ? 'text-[#4ade80]' : relayOutput === 'OFF' ? 'text-[#8a8f98]' : 'text-[#62666d]'}`}>
                      Relay {relayOutput ?? 'N/A'}
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <div key={d.id} className="flex h-[46px] items-center gap-2.5 rounded-lg px-1.5 hover:bg-white/[.03]">
                <span className="h-2 w-2 flex-none rounded-full" style={{ background: online ? '#22c55e' : '#383b3f' }} />
                <span className="flex min-w-0 flex-1 flex-col leading-tight">
                  <b className="truncate text-[13px] font-medium text-[#d0d6e0]">{name}</b>
                  <small className="truncate text-[11px] font-normal text-[#62666d]">{location}</small>
                </span>
                <span className="flex flex-none items-center gap-2.5 text-xs text-[#8a8f98] tabular-nums">
                  {online && d.latestTemperature != null && d.latestHumidity != null ? (
                    <>
                      <span>
                        <b className="font-medium text-[#d0d6e0]">{d.latestTemperature.toFixed(1)}</b>°C
                      </span>
                      <span>
                        <b className="font-medium text-[#d0d6e0]">{d.latestHumidity.toFixed(0)}</b>%
                      </span>
                    </>
                  ) : (
                    <span className="text-[#62666d]">No data</span>
                  )}
                </span>
                <span
                  className={`w-[58px] flex-none text-right text-[11px] font-medium tabular-nums ${
                    relayOutput === 'ON' ? 'text-[#4ade80]' : relayOutput === 'OFF' ? 'text-[#8a8f98]' : 'text-[#62666d]'
                  }`}
                  title="GPIO4 output reported by ESP32 #2; N/A means no recent relay feedback"
                >
                  Relay {relayOutput ?? 'N/A'}
                </span>
                <span className="flex w-[60px] flex-none flex-col text-right text-[11px] leading-tight" title={d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : 'No telemetry received'}>
                  <span className={online ? 'text-[#4ade80]' : 'text-[#8a8f98]'}>{online ? 'Online' : 'Offline'}</span>
                  <small className="mt-0.5 text-[10px] text-[#62666d]">{d.lastSeenAt ? ago(d.lastSeenAt) : 'No data'}</small>
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
