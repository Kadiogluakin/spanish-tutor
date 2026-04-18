// GET /api/review/summary
// Returns the count of due review items across the three SRS tables plus the
// earliest upcoming due-date across all three, so the dashboard preview card
// cannot disagree with what /api/review/queue actually serves.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

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

  const [vocabDueRes, errorDueRes, nextVocabRes, nextErrorRes] =
    await Promise.all([
      supabase
        .from('vocab_progress')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .lte('next_due', now),
      supabase
        .from('error_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('status', ['active', 'improved'])
        .gte('count', 2)
        .lte('next_due', now),
      supabase
        .from('vocab_progress')
        .select('next_due')
        .eq('user_id', user.id)
        .gt('next_due', now)
        .order('next_due', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('error_logs')
        .select('next_due')
        .eq('user_id', user.id)
        .in('status', ['active', 'improved'])
        .gte('count', 2)
        .gt('next_due', now)
        .order('next_due', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ]);

  const vocabDue = vocabDueRes.count ?? 0;
  const errorDue = errorDueRes.count ?? 0;

  const upcoming = [nextVocabRes.data?.next_due, nextErrorRes.data?.next_due]
    .filter(Boolean)
    .sort()[0];

  return NextResponse.json({
    totalDue: vocabDue + errorDue,
    vocabDue,
    errorDue,
    skillDue: 0, // retained for backwards-compatibility; always 0 now
    nextReviewTime: upcoming ?? null,
  });
}
