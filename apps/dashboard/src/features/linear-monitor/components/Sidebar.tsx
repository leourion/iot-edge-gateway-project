'use client';

import {
  AlertTriangle,
  BarChart3,
  Monitor,
  ScrollText,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  deviceCount: number;
  onlineDeviceCount: number;
  alertCount: number;
}

export function Sidebar({ open, onClose, deviceCount, onlineDeviceCount, alertCount }: SidebarProps) {
  const navItems = [
    { label: 'Overview', icon: BarChart3, current: true, href: '#overview' },
    { label: 'Devices', icon: Monitor, count: deviceCount, href: '#devices' },
    { label: 'Sensors', icon: Wifi, count: 3, href: '#sensors' },
    { label: 'Latest readings', icon: ScrollText, href: '#readings' },
    { label: 'Alerts', icon: AlertTriangle, count: alertCount, href: '#alerts' },
  ];

  return (
    <>
      {open && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={cn(
          'flex w-[244px] shrink-0 flex-col overflow-y-auto px-2 pb-2.5 pt-3 text-[13px]',
          'fixed inset-y-0 left-0 z-40 -translate-x-full bg-[#08090a] transition-transform duration-150 md:static md:translate-x-0 md:bg-transparent',
          open && 'translate-x-0',
        )}
      >
        <div className="mb-3.5 flex items-center gap-1 px-1">
          <a href="#overview" className="flex h-7 items-center gap-2 rounded-md px-1.5 text-sm font-medium text-white hover:bg-white/5">
            <span className="grid h-5 w-5 place-items-center rounded-[5px] bg-sky-500 text-[10px] font-semibold text-white">
              IoT
            </span>
              Paper Warehouse
          </a>
        </div>

        <nav className="flex flex-col gap-[2px]">
          {navItems.map(({ label, icon: Icon, current, count, href }) => (
            <a
              key={label}
              href={href}
              onClick={onClose}
              aria-current={current ? 'page' : undefined}
              className={cn(
                'flex h-7 items-center gap-2.5 rounded-md px-2.5 text-[#d0d6e0] hover:bg-white/[.04]',
                current && 'bg-white/[.07] font-medium text-white',
              )}
            >
              <Icon size={16} className={current ? 'text-white' : 'text-[#8a8f98]'} />
              <span>{label}</span>
              {count != null && <span className="ml-auto text-xs text-[#8a8f98]">{count}</span>}
            </a>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2 px-1.5 pt-3">
          <span className="flex items-center gap-1.5 text-xs text-[#8a8f98]">
            <span className={cn('h-[7px] w-[7px] rounded-full', onlineDeviceCount ? 'animate-pulse bg-[#22c55e]' : 'bg-[#62666d]')} />
            {onlineDeviceCount}/{deviceCount} devices online
          </span>
        </div>
      </aside>
    </>
  );
}
