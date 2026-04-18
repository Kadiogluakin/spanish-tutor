// GET /api/review/queue
// Returns the user's due review items (vocabulary + past-error corrections),
// already merged, shuffled, and capped for a single session. Centralising
// this here guarantees that ReviewQueue and ReviewPreview agree on what is
// due — they both call the same endpoint.
//
// Abstract "skills" (e.g. vocabulary_range, grammar_accuracy) are NOT shown
// as flashcards: SRS is for discrete recall items. Skills are still written
// to skill_progress from homework/lesson summaries and are consumed by the
// adaptive homework picker and dashboard analytics.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { shuffle } from '@/lib/review/filters';
import type { ReviewItem } from '@/lib/review/types';

export const runtime = 'nodejs';

const SESSION_CAP = 20;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date().toISOString();
  const items: ReviewItem[] = [];

  // 1. Due vocabulary (SM-2)
  const { data: vocabRows, error: vocabError } = await supabase
    .from('vocab_progress')
    .select(
      `
      id,
      sm2_easiness,
      interval_days,
      next_due,
      successes,
      failures,
      vocabulary:vocab_id (
        id,
        spanish,
        english,
        tags
      )
    `
    )
    .eq('user_id', user.id)
    .lte('next_due', now)
    .order('next_due', { ascending: true })
    .limit(30);

  if (vocabError) console.error('Review queue vocab error:', vocabError);

  for (const row of vocabRows ?? []) {
    const vocab = Array.isArray(row.vocabulary)
      ? row.vocabulary[0]
      : (row.vocabulary as { spanish?: string; english?: string; tags?: any } | null);
    if (!vocab?.spanish || !vocab?.english) continue;
    items.push({
      kind: 'vocab',
      progressId: row.id,
      nextDue: row.next_due,
      easiness: row.sm2_easiness,
      intervalDays: row.interval_days,
      successes: row.successes,
      failures: row.failures,
      front: vocab.spanish,
      back: vocab.english,
      sourceLesson:
        typeof vocab.tags === 'object' && vocab.tags !== null
          ? (vocab.tags as any).lesson ?? null
          : null,
    });
  }

  // 2. Due error-practice items
  const { data: errorRows, error: errorFetchError } = await supabase
    .from('error_logs')
    .select('*')
    .eq('user_id', user.id)
    .in('status', ['active', 'improved'])
    .gte('count', 2)
    .lte('next_due', now)
    .order('next_due', { ascending: true })
    .limit(10);

  if (errorFetchError) console.error('Review queue error error:', errorFetchError);

  for (const row of errorRows ?? []) {
    items.push({
      kind: 'error',
      progressId: row.id,
      nextDue: row.next_due ?? row.created_at,
      easiness: row.sm2_easiness ?? 2.5,
      intervalDays: row.interval_days ?? 1,
      successes: row.successes ?? 0,
      failures: row.failures ?? 0,
      errorType: row.type,
      originalError: row.spanish,
      correction: row.english,
      note: row.note,
    });
  }

  // Cap + shuffle. Prioritise most-overdue first before capping so users
  // never miss cards that have waited longest.
  items.sort((a, b) => +new Date(a.nextDue) - +new Date(b.nextDue));
  const capped = items.slice(0, SESSION_CAP);
  const shuffled = shuffle(capped);

  return NextResponse.json({ items: shuffled, total: items.length });
}
