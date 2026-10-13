import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import CatalogTimingEditor from '@/components/tool/CatalogTimingEditor';

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=/dashboard');

  const { data: song, error } = await supabase
    .from('songs')
    .select('id, title, artist, lrc_content')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new Error('Could not load your lyric timing.');
  if (!song?.lrc_content) notFound();

  return (
    <CatalogTimingEditor
      songId={song.id}
      title={song.title}
      artist={song.artist}
      initialLrc={song.lrc_content}
    />
  );
}
