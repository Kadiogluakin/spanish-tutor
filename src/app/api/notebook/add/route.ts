// POST /api/notebook/add
// Persists a Spanish word/chunk the AI just added to the student's notebook.
// The notebook used to be pure React state; now every entry also seeds the
// user's vocab_progress row (if absent) so the item enters the SM-2 cycle
// and becomes reviewable tomorrow via /api/review/queue.
//
// Two-step persistence:
//   1. Ensure a row in `vocabulary` exists (by matching `spanish`). Insert
//      with an optional English gloss if absent.
//   2. Upsert into `vocab_progress` keyed by (user_id, vocab_id) with an
//      initial SM-2 state (easiness 2.5, interval 1 day).
//
// Duplicate calls for the same word are idempotent: both vocabulary lookup
// and vocab_progress lookup short-circuit when a matching row is present.

import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/** Aligned with listening-scene seeds and short phrases; truncated safely if longer. */
const MAX_SPANISH_LENGTH = 500;
const MAX_ENGLISH_LENGTH = 120;

interface AddBody {
  spanish?: string;
  english?: string;
  lessonId?: string | null;
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
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

  let body: AddBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const spanishRaw = (body.spanish ?? '').trim();
  const spanish =
    spanishRaw.length > MAX_SPANISH_LENGTH
      ? spanishRaw.slice(0, MAX_SPANISH_LENGTH)
      : spanishRaw;
  const english = (body.english ?? '').trim();
  const lessonId = body.lessonId ?? null;

  if (!spanish) {
    return NextResponse.json(
      { error: 'spanish is required' },
      { status: 400 }
    );
  }
  if (english.length > MAX_ENGLISH_LENGTH) {
    return NextResponse.json(
      { error: 'english exceeds 120 chars' },
      { status: 400 }
    );
  }

  try {
    // Step 1: resolve or create the canonical `vocabulary` row.
    const { data: existingVocab, error: vocabLookupError } = await supabase
      .from('vocabulary')
      .select('id, english')
      .eq('spanish', spanish)
      .maybeSingle();

    if (vocabLookupError) {
      console.error('[notebook/add] vocabulary lookup error:', vocabLookupError);
      return NextResponse.json(
        { error: 'Vocabulary lookup failed' },
        { status: 500 }
      );
    }

    let vocabId: string;

    if (existingVocab?.id) {
      vocabId = existingVocab.id;

      // Backfill a missing English gloss if the AI supplied one this time.
      if (english && !existingVocab.english) {
        await supabase
          .from('vocabulary')
          .update({ english })
          .eq('id', vocabId);
      }
    } else {
      const newId = uuidv4();
      const { data: inserted, error: insertError } = await supabase
        .from('vocabulary')
        .insert({
          id: newId,
          spanish,
          // The review queue filters out items without an English gloss, so
          // fall back to the Spanish string itself when the AI omitted the
          // translation. This keeps the row reviewable (front=back) until a
          // future call upgrades the gloss.
          english: english || spanish,
          tags: {
            source: 'notebook',
            lesson: lessonId,
          },
        })
        .select('id')
        .single();

      if (insertError || !inserted) {
        console.error('[notebook/add] vocabulary insert error:', insertError);
        return NextResponse.json(
          { error: 'Failed to save vocabulary' },
          { status: 500 }
        );
      }
      vocabId = inserted.id;
    }

    // Step 2: seed vocab_progress if this user doesn't have a row yet.
    const { data: existingProgress, error: progressLookupError } = await supabase
      .from('vocab_progress')
      .select('id')
      .eq('user_id', user.id)
      .eq('vocab_id', vocabId)
      .maybeSingle();

    if (progressLookupError) {
      console.error(
        '[notebook/add] vocab_progress lookup error:',
        progressLookupError
      );
      return NextResponse.json(
        { error: 'Progress lookup failed' },
        { status: 500 }
      );
    }

    if (existingProgress?.id) {
      return NextResponse.json({ success: true, vocabId, already: true });
    }

    const { error: insertProgressError } = await supabase
      .from('vocab_progress')
      .insert({
        user_id: user.id,
        vocab_id: vocabId,
        sm2_easiness: 2.5,
        interval_days: 1,
        reps: 0,
        successes: 0,
        failures: 0,
        next_due: daysFromNow(1),
      });

    if (insertProgressError) {
      console.error(
        '[notebook/add] vocab_progress insert error:',
        insertProgressError
      );
      return NextResponse.json(
        { error: 'Failed to seed progress' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, vocabId, already: false });
  } catch (err) {
    console.error('[notebook/add] exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
