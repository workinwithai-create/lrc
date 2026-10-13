import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parseLrc, serializeLrc } from '@/lib/lrc-timing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Only the owner can save a correction to an existing LRC Forge song. */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Sign in to save timing changes' }, { status: 401 });

  let body: { lrc?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 }); }

  if (typeof body?.lrc !== 'string' || body.lrc.length > 256_000) {
    return NextResponse.json({ error: 'Invalid or oversized lyric file' }, { status: 400 });
  }
  const doc = parseLrc(body.lrc);
  if (doc.lines.length === 0 || doc.lines.length > 5000 ||
      doc.lines.some((line, i) => !Number.isFinite(line.seconds) ||
        line.seconds > 24 * 60 * 60 ||
        (i > 0 && line.seconds < doc.lines[i - 1].seconds))) {
    return NextResponse.json({ error: 'Expected ordered, timestamped lyric lines' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('songs')
    .update({ lrc_content: serializeLrc(doc), line_count: doc.lines.length })
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[LRC timing] Save failed:', error);
    return NextResponse.json({ error: 'Could not save corrections' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  return NextResponse.json({ success: true, songId: data.id });
}
