'use client';

import { LogOut, Menu, PanelRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Device } from '@/features/dashboard/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface TopbarProps {
  username: string;
  role: 'admin' | 'user';
  devices: Device[];
  activeDeviceId: string | undefined;
  onSelectDevice: (id: string) => void;
  isMock: boolean;
  connectionStatus: 'connecting' | 'live' | 'error';
  lastUpdatedLabel: string;
  onRefresh: () => void;
  onOpenNav: () => void;
  onToggleSidebar: () => void;
}

export function Topbar({
  username,
  role,
  devices,
  activeDeviceId,
  onSelectDevice,
  isMock,
  connectionStatus,
  lastUpdatedLabel,
  onRefresh,
  onOpenNav,
  onToggleSidebar,
}: TopbarProps) {
  const router = useRouter();
  const [spinning, setSpinning] = useState(false);
  const activeDevice = devices.find((d) => d.id === activeDeviceId) ?? devices[0];

  function handleRefresh() {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 600);
  }

  async function handleLogout() {
    await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001'}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    }).catch(() => undefined);
    router.replace('/login');
  }

  return (
    <div>
      <header className="flex h-[46px] items-center gap-2 pl-4 pr-3">
        <button
          aria-label="Open navigation"
          className="mr-1 grid h-7 w-7 place-items-center rounded-lg text-[#8a8f98] hover:bg-white/[.06] hover:text-white md:hidden"
          onClick={onOpenNav}
        >
          <Menu size={16} />
        </button>
        <div className="flex min-w-0 items-center gap-2 whitespace-nowrap text-[13px] text-[#d0d6e0]">
          <b className="text-[14px] font-medium text-white">Paper warehouse</b>
          {activeDevice?.name && (
            <>
              <span className="text-[#62666d]">·</span>
              <span>{activeDevice.name}</span>
            </>
          )}
        </div>
        <Badge
          variant={connectionStatus === 'error' && !isMock ? 'destructive' : 'success'}
          className={cn(
            'inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-[11px] font-medium',
            isMock && 'bg-amber-400/10 text-amber-300',
            connectionStatus === 'live' && 'bg-[#22c55e]/[.12] text-[#4ade80]',
            connectionStatus === 'connecting' && 'bg-white/[.08] text-[#8a8f98]',
            connectionStatus === 'error' && !isMock && 'bg-red-400/10 text-red-300',
          )}
          title={isMock ? 'Simulated preview data' : connectionStatus === 'live' ? 'Live from apps/api' : 'API connection status'}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', connectionStatus === 'live' && 'animate-pulse bg-[#22c55e]', connectionStatus === 'connecting' && 'bg-[#8a8f98]', connectionStatus === 'error' && !isMock && 'bg-red-400', isMock && 'bg-amber-300')} />
          {isMock ? 'Preview' : connectionStatus === 'live' ? 'Live' : connectionStatus === 'error' ? 'API offline' : 'Connecting'}
        </Badge>
        <span className="text-xs text-[#62666d]">{lastUpdatedLabel}</span>
        <span className="hidden rounded-md bg-white/[.05] px-2 py-1 text-[10px] text-[#8a8f98] sm:inline" title={username}>
          {role === 'admin' ? 'Admin' : 'User'}
        </span>
        <span className="flex-1" />
        <span className="rounded-md bg-white/[.05] px-2.5 py-1.5 text-xs text-[#8a8f98]">°C</span>
        <Button
            variant="outline"
            size="icon"
            aria-label="Refresh now"
            className="min-h-0 h-[30px] w-[30px] rounded-full border-0 bg-white/[.05] p-0 text-[#8a8f98] hover:bg-white/[.08] hover:text-white"
            onClick={handleRefresh}
          >
          <RefreshCw size={16} className={cn(spinning && 'animate-spin')} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Log out"
          title="Log out"
          className="min-h-0 h-[30px] w-[30px] rounded-full border-0 bg-white/[.05] p-0 text-[#8a8f98] hover:bg-white/[.08] hover:text-white"
          onClick={handleLogout}
        >
          <LogOut size={15} />
        </Button>
        <button
          aria-label="Toggle sidebar"
          className="hidden h-[30px] w-[30px] place-items-center rounded-full bg-white/[.05] text-[#8a8f98] hover:bg-white/[.08] hover:text-white md:grid"
          onClick={onToggleSidebar}
        >
          <PanelRight size={16} />
        </button>
      </header>

      <div className="flex h-11 items-center gap-1.5 overflow-x-auto px-3">
        {devices.map((d) => {
          const active = d.id === activeDevice?.id;
          const online = d.status === 'ONLINE';
          return (
            <button
              key={d.id}
              aria-pressed={active}
              onClick={() => onSelectDevice(d.id)}
              className={cn(
                'inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-lg bg-white/[.035] px-2.5 text-xs font-medium text-[#8a8f98] hover:bg-white/[.06] hover:text-[#d0d6e0]',
                active && 'bg-white/10 text-white',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-[#22c55e]' : 'bg-[#383b3f]')} />
              {d.name}
            </button>
          );
        })}
        <span className="flex-1" />
        <span className="pr-1 text-xs text-[#62666d]">All temperatures in °C</span>
      </div>
    </div>
  );
}
