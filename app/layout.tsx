import type { Metadata } from 'next';
import '../brand/brand.css';
import './globals.css';
import { fontClasses } from '../brand/fonts';
import WWANav from '../brand/components/WWANav';
import WWAFooter from '../brand/components/WWAFooter';

export const metadata: Metadata = {
  title: 'LRC Forge — Whisper-powered lyric timing',
  description: 'Upload a song, get a perfectly synced .lrc file. The lyric timing toolkit for independent artists.',
  openGraph: {
    title: 'LRC Forge',
    description: 'Whisper-powered lyric timing for independent artists',
    type: 'website',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={fontClasses}>
        <WWANav currentApp="LRC Forge" />
        {children}
        <WWAFooter />
      </body>
    </html>
  );
}
