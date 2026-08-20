// Root layout for the Chokro operations app: applies global metadata, viewport, and the shared stylesheet.
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

// Document metadata shared across the app; page routes override the title suffix.
export const metadata: Metadata = {
  title: {
    default: 'Chokro',
    template: '%s | Chokro',
  },
  description: 'Chokro circular economy operations platform.',
};

// Mobile viewport settings, including the theme color that tints the browser UI.
export const viewport: Viewport = {
  themeColor: '#f7f8f5',
  width: 'device-width',
  initialScale: 1,
};

// Wraps every page in the base <html> shell and lets child layouts fill the body.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
