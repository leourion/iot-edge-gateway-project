/**
 * Threshold zones used to render the coloured range bars in <SensorRows />
 * and to derive an "ok" / "warn" / "crit" status for each channel.
 *
 * Tune these to match the real environment the ESP32 units are deployed in.
 */
export type ThresholdKey = 'temperature' | 'humidity';
export type SensorStatus = 'ok' | 'warn' | 'crit';

export interface ThresholdZone {
  min: number;
  max: number;
  warnLo: number;
  okLo: number;
  okHi: number;
  warnHi: number;
  unit: string;
}

export const THRESHOLDS: Record<ThresholdKey, ThresholdZone> = {
  // Fan starts at >=30°C / >=75% RH and stops only when both are <=28°C / <=70%.
  // Show the hysteresis band as Watch so the dashboard doesn't imply the fan
  // should switch back off as soon as a reading falls below its ON threshold.
  temperature: { min: 0, max: 50, warnLo: 15, okLo: 18, okHi: 28, warnHi: 30, unit: '°C' },
  humidity: { min: 0, max: 100, warnLo: 25, okLo: 35, okHi: 70, warnHi: 75, unit: '%' },
};

export function statusFor(key: ThresholdKey, value: number): SensorStatus {
  const t = THRESHOLDS[key];
  if (value < t.warnLo || value >= t.warnHi) return 'crit';
  if (value < t.okLo || value > t.okHi) return 'warn';
  return 'ok';
}

export const STATUS_LABEL: Record<SensorStatus, string> = {
  ok: 'Normal',
  warn: 'Watch',
  crit: 'Alert',
};

// Hardcoded to the exact hex values used in the static HTML reference
// (Tailwind's named shades like emerald-400/amber-400 are close but not
// identical to these, e.g. emerald-400 #34d399 vs the reference's #4ade80).
export const STATUS_TEXT_CLASS: Record<SensorStatus, string> = {
  ok: 'text-[#4ade80]',
  warn: 'text-[#facc15]',
  crit: 'text-[#f87171]',
};
