-- Apply once before deploying the audio-persistence LRC Forge code.
-- Backwards compatible: legacy songs remain valid with NULL audio_path.
alter table public.songs add column if not exists audio_path text;
alter table public.songs add column if not exists audio_filename text;

-- Existing SQL files lacked an UPDATE policy even though timing corrections require one.
drop policy if exists "users update own songs" on public.songs;
create policy "users update own songs" on public.songs
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Keep lrc-audio-uploads PRIVATE. Server validates user ownership before issuing
-- short-lived signed playback/download links. Do not make this bucket public.
