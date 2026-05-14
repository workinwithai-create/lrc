import type { Metadata } from 'next';
import './globals.css';

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
      <body>{children}</body>
    </html>
  );
}
