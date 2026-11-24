import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://lrcforge.workinwithai.com'),
  title: 'LRC Forge — Synced .lrc lyrics and lyric videos from your song',
  description: 'Upload a song and get a perfectly synced .lrc lyric file, then turn it into a lyric video or karaoke track. The lyric timing toolkit for independent artists.',
  openGraph: {
    title: 'LRC Forge — Synced lyrics and lyric videos',
    description: 'Upload a song, get a synced .lrc file, and make a lyric video from the same timing. Built for independent artists.',
    type: 'website',
    url: 'https://lrcforge.workinwithai.com',
    siteName: 'LRC Forge by WorkinWithAI',
  },
  twitter: {
    card: 'summary',
    title: 'LRC Forge — Synced lyrics and lyric videos',
    description: 'Upload a song, get a synced .lrc file, and make a lyric video from the same timing.',
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
