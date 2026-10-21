import { Power } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Device } from '../types';
import { controlRelayAction } from '../actions/control-relay.action';

interface DeviceListProps {
  devices: Device[];
}

export function DeviceList({ devices }: DeviceListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
      </CardHeader>
      <CardContent>
        {devices.length === 0 ? <p className="text-sm text-muted-foreground">No device data yet.</p> : null}
        <div className="divide-y divide-border">
          {devices.map((device) => (
            <div className="flex items-center justify-between gap-3 py-3" key={device.id}>
              <div>
                <strong>{device.name}</strong>
                <div className="text-sm text-muted-foreground">
                  {device.latestTemperature ?? '--'}C / {device.latestHumidity ?? '--'}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {device.lastSeenAt
                    ? `Last seen ${formatDistanceToNow(new Date(device.lastSeenAt), { addSuffix: true })}`
                    : 'No heartbeat yet'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={device.status === 'ONLINE' ? 'success' : 'muted'}>{device.status}</Badge>
                <form
                  action={async () => {
                    'use server';
                    await controlRelayAction(device.id, device.relayStatus === 'ON' ? 'OFF' : 'ON');
                  }}
                >
                  <Button size="sm" title="Toggle relay" type="submit" variant="secondary">
                    <Power size={16} />
                    {device.relayStatus}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
