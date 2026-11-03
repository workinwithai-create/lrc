import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdmin } from '@/lib/supabase/server';
import { AUDIO_UPLOAD_BUCKET, MAX_AUDIO_BYTES } from '@/lib/audio-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function ownerSong(id: string) {
  if (!UUID.test(id)) return { error: NextResponse.json({ error: 'Invalid song ID' }, { status: 400 }) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  const { data: song, error } = await supabase.from('songs')
    .select('id, audio_path, audio_filename')
    .eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error) return { error: NextResponse.json({ error: 'Could not load song' }, { status: 500 }) };
  if (!song) return { error: NextResponse.json({ error: 'Song not found' }, { status: 404 }) };
  return { supabase, user, song };
}

/** Private playback or download only after verifying the song's owner. */
export async function GET(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const result = await ownerSong(id);
  if (result.error) return result.error;
  const { user, song } = result;
  if (!user || !song?.audio_path || !song.audio_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'No saved recording for this song' }, { status: 404 });
  }
  const isDownload = request.nextUrl.searchParams.get('download') === '1';
  const safeName = (song.audio_filename || 'recording.mp3').replace(/[\\/\r\n]/g, '_').slice(0, 255);
  const { data, error } = await createAdmin().storage.from(AUDIO_UPLOAD_BUCKET)
    .createSignedUrl(song.audio_path, 120, isDownload ? { download: safeName } : undefined);
  if (error || !data) return NextResponse.json({ error: 'Could not open the saved recording' }, { status: 502 });
  const response = NextResponse.redirect(data.signedUrl, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

/** Relink a recording to an older saved LRC without regenerating or charging credits. */
export async function POST(request: NextRequest, context: Context) {
  const { id } = await context.params;
  const result = await ownerSong(id);
  if (result.error) return result.error;
  const { supabase, user, song } = result;
  if (!supabase || !user || !song) return NextResponse.json({ error: 'Unavailable' }, { status: 500 });
  if (song.audio_path) return NextResponse.json({ error: 'This song already has a saved recording' }, { status: 409 });

  let body: { path?: unknown; filename?: unknown };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const path = body.path;
  const filename = body.filename;
  if (typeof path !== 'string' || typeof filename !== 'string' ||
      filename.length < 1 || filename.length > 255 ||
      !new RegExp(`^${user.id}/[a-f0-9-]{36}\\.(?:mp3|wav|m4a|flac|ogg|aac|webm|audio)$`, 'i').test(path)) {
    return NextResponse.json({ error: 'Invalid recording' }, { status: 400 });
  }

  // Signed upload tokens are scoped to the user's folder. Verify the object exists.
  const basename = path.split('/')[1];
  const admin = createAdmin();
  const { data: objects, error: listError } = await admin.storage.from(AUDIO_UPLOAD_BUCKET)
    .list(user.id, { search: basename, limit: 10 });
  const found = objects?.find(object => object.name === basename);
  if (listError || !found) return NextResponse.json({ error: 'The uploaded recording could not be found' }, { status: 400 });
  if (found.metadata?.size && Number(found.metadata.size) > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Recording exceeds 25MB limit' }, { status: 413 });
  }

  const { data: updated, error: updateError } = await supabase.from('songs')
    .update({ audio_path: path, audio_filename: filename })
    .eq('id', id).eq('user_id', user.id).is('audio_path', null)
    .select('id').maybeSingle();
  if (updateError) return NextResponse.json({ error: 'Could not save recording link' }, { status: 500 });
  if (!updated) return NextResponse.json({ error: 'Recording was linked elsewhere; reload your song' }, { status: 409 });
  return NextResponse.json({ success: true });
}
