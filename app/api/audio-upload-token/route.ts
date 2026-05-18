import { NextResponse } from 'next/server';
import { createClient, createAdmin } from '@/lib/supabase/server';
import { AUDIO_UPLOAD_BUCKET, MAX_AUDIO_BYTES, getSafeAudioExtension } from '@/lib/audio-storage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { fileName, contentType, size } = await req.json();
    const uploadSize = Number(size);

    if (!fileName || !contentType || !Number.isFinite(uploadSize)) {
      return NextResponse.json({ error: 'Missing upload metadata' }, { status: 400 });
    }

    if (!String(contentType).startsWith('audio/')) {
      return NextResponse.json({ error: 'Only audio uploads are supported' }, { status: 415 });
    }

    if (uploadSize > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file exceeds 25MB limit' }, { status: 413 });
    }

    const admin = createAdmin();
    const { data: buckets, error: listError } = await admin.storage.listBuckets();

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    if (!buckets?.some((bucket) => bucket.name === AUDIO_UPLOAD_BUCKET)) {
      const { error: bucketError } = await admin.storage.createBucket(AUDIO_UPLOAD_BUCKET, {
        public: false,
        fileSizeLimit: MAX_AUDIO_BYTES,
      });

      if (bucketError) {
        return NextResponse.json({ error: bucketError.message }, { status: 500 });
      }
    }

    const ext = getSafeAudioExtension(String(fileName), String(contentType));
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { data, error } = await admin.storage
      .from(AUDIO_UPLOAD_BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || 'Could not create upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      path,
      token: data.token,
      signedUrl: data.signedUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Could not prepare audio upload' },
      { status: 500 }
    );
  }
}
