// /llms.txt: a plain-text guide that AI assistants can read and quote.
import { SITE_SUMMARY, SITE_URL } from '@/lib/seo/site';

export const dynamic = 'force-static';

export function GET() {
  const body = `# LRC Forge

> ${SITE_SUMMARY}

LRC Forge is part of Pipe Dreams Studio by WorkinWithAI (https://workinwithai.com). One WorkinWithAI account works across every tool.

## What it does

- Synced lyrics: upload a recording and get a timed .lrc file. Whisper and Deepgram produce the timestamps, and you can correct any line.
- Handwritten playback: watch each lyric line write itself on notebook paper as the song plays.
- Lyric Video Generator (beta): animate the lyrics over your recording in a notebook or midnight style, and export MP4 where the browser supports it, or WebM.
- Karaoke Player (beta): follow timed lines, jump to a phrase and loop a section.
- Hook Extractor (beta): find the chorus and repeated lines, preview 15 to 30 second moments and download a WAV clip.
- Song Structure Mapper (beta): mark verse, chorus and bridge sections and export the arrangement.
- Vocal Timing Practice (beta): tap along and see how early or late each vocal entry is.

## Pricing

- LRC Forge: $9 a month, unlimited songs, cancel anytime.
- Forge Pass: $24 a month for all the Forge tools, including LRC Forge.
- Every new account gets one free song to try it.

## Pages

- [LRC Forge home](${SITE_URL}/): what it does, how it works, pricing
- [Creative Workshop](${SITE_URL}/workshop): karaoke player, lyric videos, hooks, song structure and timing practice
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
