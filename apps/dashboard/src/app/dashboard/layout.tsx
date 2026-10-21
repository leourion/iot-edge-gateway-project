import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata = {
  title: 'Paper Warehouse · IoT Monitor',
  description: 'Live environmental monitoring for a paper warehouse.',
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className={`${inter.className} ${inter.variable}`} style={{ fontFeatureSettings: '"cv01","ss03","zero"' }}>
      {children}
    </div>
  );
}
