import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

// Scoped to /monitor only — the rest of the app keeps its Arial body font
// (set in src/app/globals.css), so we don't touch the shared root layout.
const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'ESP32-01 · Living Room · IoT Lab',
  description: 'Linear-style live view of ESP32 temperature, humidity and AI anomaly telemetry.',
};

export default function MonitorLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.className} ${inter.variable}`} style={{ fontFeatureSettings: '"cv01","ss03","zero"' }}>
      {children}
    </div>
  );
}
