import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Alert } from '../types';

interface AlertListProps {
  alerts: Alert[];
}

export function AlertList({ alerts }: AlertListProps) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader>
        <CardTitle>Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? <p className="text-sm text-muted-foreground">No alerts yet.</p> : null}
        <div className="divide-y divide-border">
          {alerts.map((alert) => (
            <div className="flex items-center justify-between gap-3 py-3" key={alert.id}>
              <div>
                <strong>{alert.message}</strong>
                <div className="text-sm text-muted-foreground">
                  {alert.deviceId} / {formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
                </div>
              </div>
              <Badge variant={alert.severity === 'CRITICAL' ? 'destructive' : 'warning'}>{alert.severity}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
