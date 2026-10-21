import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AiRiskLevel, TelemetryReading } from '../types';

interface ReadingListProps {
  readings: TelemetryReading[];
}

export function ReadingList({ readings }: ReadingListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Latest readings</CardTitle>
      </CardHeader>
      <CardContent>
        {readings.length === 0 ? <p className="text-sm text-muted-foreground">Waiting for telemetry.</p> : null}
        <div className="divide-y divide-border">
          {readings.map((reading) => (
            <div className="flex items-center justify-between gap-3 py-3" key={reading.id}>
              <div>
                <strong>{reading.deviceId}</strong>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(reading.observedAt), { addSuffix: true })}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Badge variant={toRiskVariant(reading.ai.riskLevel)}>{reading.ai.riskLevel}</Badge>
                  <span className="text-xs text-muted-foreground">
                    score {reading.ai.anomalyScore.toFixed(2)} / {reading.ai.modelVersion ?? 'no-model'}
                  </span>
                </div>
              </div>
              <div className="font-medium">
                {reading.temperature}C / {reading.humidity}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function toRiskVariant(riskLevel: AiRiskLevel) {
  if (riskLevel === 'critical') {
    return 'destructive';
  }

  if (riskLevel === 'warning') {
    return 'warning';
  }

  if (riskLevel === 'normal') {
    return 'success';
  }

  return 'muted';
}
