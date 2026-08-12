import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Chokro',
    template: '%s | Chokro',
  },
  description: 'Chokro circular economy operations platform.',
};

export const viewport: Viewport = {
  themeColor: '#f7f8f5',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
