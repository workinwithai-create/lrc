import { NextResponse } from 'next/server';
import { createClient, createAdmin } from '@/lib/supabase/server';
import { AUDIO_UPLOAD_BUCKET, isUserAudioPath } from '@/lib/audio-storage';

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
