import { apiGet, apiPost } from '@/lib/api-client';
import type { DashboardOverview, RelayControlCommand } from '../types';

export function getDashboardOverview(): Promise<DashboardOverview> {
  return apiGet<DashboardOverview>('/dashboard/overview');
}

export function controlRelay(deviceId: string, relayStatus: RelayControlCommand) {
  return apiPost(`/devices/${deviceId}/control/relay`, { relayStatus });
}
