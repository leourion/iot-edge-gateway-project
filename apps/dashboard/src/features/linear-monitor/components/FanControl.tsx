'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { controlRelay } from '@/features/dashboard/services/dashboard-api';
import type { RelayControlCommand } from '@/features/dashboard/types';

interface FanControlProps {
  deviceId?: string;
  online: boolean;
  isMock: boolean;
  canControl: boolean;
}

const COMMAND_LABEL: Record<RelayControlCommand, string> = {
  ON: 'Bật quạt',
  OFF: 'Tắt quạt',
  AUTO: 'Chế độ tự động',
};

export function FanControl({ deviceId, online, isMock, canControl }: FanControlProps) {
  const [pending, setPending] = useState<RelayControlCommand | null>(null);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);
  const disabled = !canControl || !deviceId || !online || isMock || pending !== null;

  async function send(command: RelayControlCommand) {
    if (!deviceId || disabled) return;
    setPending(command);
    setMessage('');
    setFailed(false);

    try {
      await controlRelay(deviceId, command);
      setMessage(`${COMMAND_LABEL[command]} đã gửi tới broker; chờ telemetry xác nhận.`);
    } catch {
      setFailed(true);
      setMessage('Không gửi được lệnh. Kiểm tra kết nối API và MQTT local.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-white/[.06] bg-black/10 px-2.5 py-2">
      <div className="mr-auto min-w-[150px]">
        <div className="text-xs font-medium text-[#d0d6e0]">Điều khiển quạt</div>
        <div className="text-[10px] text-[#62666d]">{canControl ? 'Lệnh tay giữ nguyên đến khi chọn Tự động hoặc ESP32 khởi động lại.' : 'Tài khoản user chỉ được xem; admin mới có thể điều khiển.'}</div>
      </div>
      <Button
        size="sm"
        variant="default"
        className="min-w-[64px]"
        disabled={disabled}
        onClick={() => void send('ON')}
        aria-label="Bật quạt"
      >
        {pending === 'ON' ? 'Đang gửi…' : 'Bật'}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="min-w-[64px]"
        disabled={disabled}
        onClick={() => void send('OFF')}
        aria-label="Tắt quạt"
      >
        {pending === 'OFF' ? 'Đang gửi…' : 'Tắt'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="min-w-[76px]"
        disabled={disabled}
        onClick={() => void send('AUTO')}
        aria-label="Trả quyền điều khiển quạt về chế độ tự động"
      >
        {pending === 'AUTO' ? 'Đang gửi…' : 'Tự động'}
      </Button>
      <div className="basis-full min-h-[16px]">
        {message && (
          <p role="status" className={`text-[11px] ${failed ? 'text-red-400' : 'text-[#8a8f98]'}`}>
            {message}
          </p>
        )}
      </div>
      {(isMock || !online) && (
        <p className="basis-full text-[11px] text-[#facc15]">
          {!online ? 'Thiết bị đang offline; điều khiển bị khóa.' : 'Đang hiển thị dữ liệu mô phỏng; điều khiển bị khóa.'}
        </p>
      )}
    </div>
  );
}
