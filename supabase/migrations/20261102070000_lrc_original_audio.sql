-- Non-destructive migration for the shared WorkinWithAI songs table.
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS audio_storage_path text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS audio_file_name text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS audio_content_type text;
ALTER TABLE public.songs ADD COLUMN IF NOT EXISTS audio_size_bytes bigint;
-- Existing owner-scoped songs RLS stays intact; storage bucket stays private.
