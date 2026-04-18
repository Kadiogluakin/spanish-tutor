// GET /api/mistakes/list
// Returns the student's top recurring mistakes for the visible
// "Cosas para Repasar" panel. Separate from /api/review/queue (which drives
// the flashcard review loop) because:
//   - The panel shows the top N mistakes by persistence/count, not just due-today.
//   - We want to show them even when next_due is in the future, as a
//     confidence-builder ("here's what we've worked on").

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const DEFAULT_LIMIT = 10;

export interface MistakeRow {
  id: string;
  type: string;
  spanish: string;
  english: string;
  note: string;
  count: number;
  status: string;
  lastSeen: string;
  nextDue: string | null;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limitParam = parseInt(url.searchParams.get('limit') ?? '', 10);
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 && limitParam <= 50
      ? limitParam
      : DEFAULT_LIMIT;

  try {
    const { data: rows, error } = await supabase
      .from('error_logs')
      .select('id, type, spanish, english, note, count, status, last_seen, next_due, created_at')
      .eq('user_id', user.id)
      .in('status', ['active', 'improved'])
      .order('count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[mistakes/list] query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch mistakes' },
        { status: 500 }
      );
    }

    const items: MistakeRow[] = (rows ?? []).map((row: {
      id: string;
      type: string | null;
      spanish: string | null;
      english: string | null;
      note: string | null;
      count: number | null;
      status: string | null;
      last_seen: string | null;
      next_due: string | null;
      created_at: string;
    }) => ({
      id: row.id,
      type: row.type ?? 'grammar',
      spanish: row.spanish ?? '',
      english: row.english ?? '',
      note: row.note ?? '',
      count: row.count ?? 1,
      status: row.status ?? 'active',
      lastSeen: row.last_seen ?? row.created_at,
      nextDue: row.next_due,
    }));

    return NextResponse.json({ items });
  } catch (err) {
    console.error('[mistakes/list] exception:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
