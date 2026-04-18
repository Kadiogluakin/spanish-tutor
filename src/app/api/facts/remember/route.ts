// POST /api/facts/remember
// Upserts a durable personal fact the student volunteered, keyed by
// (user_id, key). Called from the `remember_student_fact` realtime tool.
// The same `key` overwrites rather than piling up new rows — so
// {key: "travel_plan", value: "moving to Madrid in July"} can be
// superseded by {key: "travel_plan", value: "postponed to September"}.
//
// Failures are fatal for the client write but not for the lesson: VoiceHUD's
// call site is fire-and-forget.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const MAX_KEY_LENGTH = 60;
const MAX_VALUE_LENGTH = 240;

interface RememberBody {
  key?: string;
  value?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: RememberBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const key = (body.key ?? '').trim();
  const value = (body.value ?? '').trim();

  if (!key || key.length > MAX_KEY_LENGTH) {
    return NextResponse.json(
      { error: `key required (1-${MAX_KEY_LENGTH} chars)` },
      { status: 400 }
    );
  }
  if (!value || value.length > MAX_VALUE_LENGTH) {
    return NextResponse.json(
      { error: `value required (1-${MAX_VALUE_LENGTH} chars)` },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase.from('user_facts').upsert(
      {
        user_id: user.id,
        key,
        value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,key' }
    );

    if (error) {
      console.error('[facts/remember] upsert error:', error);
      return NextResponse.json(
        { error: 'Failed to save fact' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[facts/remember] exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
