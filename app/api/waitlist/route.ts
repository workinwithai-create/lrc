import { NextRequest, NextResponse } from 'next/server';
import { createAdmin } from '@/lib/supabase/server';

const VALID_FEATURES = ['karaoke', 'video', 'timing', 'snippets', 'structure'];

export async function POST(req: NextRequest) {
  try {
    const { email, feature } = await req.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    if (!VALID_FEATURES.includes(feature)) {
      return NextResponse.json({ error: 'Invalid feature' }, { status: 400 });
    }

    const supabase = createAdmin();
    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.toLowerCase().trim(), feature });

    if (error && error.code !== '23505') { // ignore unique violation
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
