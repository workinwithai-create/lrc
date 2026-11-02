import { NextResponse } from 'next/server';
import { createClient, createAdmin } from '@/lib/supabase/server';
import { AUDIO_UPLOAD_BUCKET, MAX_AUDIO_BYTES, isUserAudioPath } from '@/lib/audio-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Only a song owner can retrieve its original private recording. */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: 'Sign in to retrieve your audio' }, { status: 401 });

  const { data: song, error } = await supabase
    .from('songs')
    .select('audio_storage_path, audio_file_name, audio_content_type')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: 'Could not load the saved song' }, { status: 500 });
  if (!song?.audio_storage_path) return NextResponse.json({ error: 'No saved audio for this song' }, { status: 404 });
  if (!isUserAudioPath(song.audio_storage_path, user.id)) {
    return NextResponse.json({ error: 'Invalid saved audio location' }, { status: 500 });
  }

  const { data, error: signError } = await createAdmin().storage
    .from(AUDIO_UPLOAD_BUCKET).createSignedUrl(song.audio_storage_path, 3600);
  if (signError || !data) {
    return NextResponse.json({ error: 'Original audio is unavailable' }, { status: 502 });
  }
  return NextResponse.json({
    url: data.signedUrl,
    fileName: song.audio_file_name || 'original-audio',
    contentType: song.audio_content_type || 'audio/mpeg',
  }, { headers: { 'Cache-Control': 'no-store' } });
}


/** Permanently attach an original recording to a pre-existing LRC-only project. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in to save audio' }, { status: 401 });

  let body: { path?: unknown; fileName?: unknown; contentType?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid upload metadata' }, { status: 400 });
  }
  const path = body.path;
  const name = body.fileName;
  const mime = body.contentType;
  const size = Number(body.size);
  if (typeof path !== 'string' || !isUserAudioPath(path, user.id) ||
      typeof name !== 'string' || name.length < 1 || name.length > 255 ||
      typeof mime !== 'string' || !mime.startsWith('audio/') ||
      !Number.isSafeInteger(size) || size <= 0 || size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: 'Invalid original audio metadata' }, { status: 400 });
  }

  const { data: song, error: lookupError } = await supabase.from('songs')
    .select('id, audio_storage_path')
    .eq('id', id).eq('user_id', user.id).maybeSingle();

  if (lookupError) return NextResponse.json({ error: 'Could not check this project' }, { status: 500 });
  if (!song) return NextResponse.json({ error: 'Song not found' }, { status: 404 });
  if (song.audio_storage_path) {
    return NextResponse.json({ error: 'This song already has an original recording' }, { status: 409 });
  }

  // Validate the file exists in private storage before linking it to a song.
  const { data: object, error: objectError } = await createAdmin().storage
    .from(AUDIO_UPLOAD_BUCKET).info(path);
  if (objectError || !object || Number(object.size) !== size) {
    return NextResponse.json({ error: 'The uploaded audio file could not be verified' }, { status: 400 });
  }

  const { data: saved, error: updateError } = await supabase.from('songs')
    .update({
      audio_storage_path: path,
      audio_file_name: name,
      audio_content_type: mime,
      audio_size_bytes: size,
    })
    .eq('id', id).eq('user_id', user.id).is('audio_storage_path', null)
    .select('id').maybeSingle();

  if (updateError) return NextResponse.json({ error: 'Could not save this audio to the song' }, { status: 500 });
  if (!saved) return NextResponse.json({ error: 'Song audio was already attached or song was not found' }, { status: 409 });
  return NextResponse.json({ success: true, songId: saved.id }, { headers: { 'Cache-Control': 'no-store' } });
}
