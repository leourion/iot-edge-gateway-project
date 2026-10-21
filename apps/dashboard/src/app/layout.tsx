import type { Metadata } from 'next';
import './globals.css';
import { AuthGate } from '@/features/auth/AuthGate';

export const metadata: Metadata = {
  title: 'IoT Environment Monitor',
  description: 'Dashboard for ESP32 environmental telemetry and relay control.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><AuthGate>{children}</AuthGate></body>
    </html>
  );
}

