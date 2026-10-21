'use server';

import { revalidatePath } from 'next/cache';
import { controlRelay } from '../services/dashboard-api';
import type { RelayControlCommand } from '../types';

export async function controlRelayAction(deviceId: string, relayStatus: RelayControlCommand) {
  await controlRelay(deviceId, relayStatus);
  revalidatePath('/');
}
