// Server-side helper to fetch the user's due review items in-process, so
// the token route can inject them into the system prompt without a self-HTTP
// round-trip.
//
// Returns the items in a compact shape convenient for prompt-string
// formatting. Callers should treat a failure to load as a soft miss: the
// lesson proceeds without a retrieval sprint rather than blocking session
// creation.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface DueVocabItem {
  kind: 'vocab';
  spanish: string;
  english: string;
  intervalDays: number;
  successes: number;
  failures: number;
}

export interface DueErrorItem {
  kind: 'error';
  errorType: string;
  spanish: string;
  english: string;
  note: string;
  count: number;
}

export type DueItem = DueVocabItem | DueErrorItem;

interface LoadOptions {
  vocabLimit?: number;
  errorLimit?: number;
}

const DEFAULT_VOCAB_LIMIT = 5;
const DEFAULT_ERROR_LIMIT = 3;

/**
 * Load the student's most-persistent mistakes regardless of SRS due date,
 * so the AI can recycle them silently even when they're not strictly due.
 * Kept separate from loadDueReviewItems to keep semantics clear.
 */
export async function loadTopMistakes(
  supabase: SupabaseClient,
  userId: string,
  limit = 5
): Promise<DueErrorItem[]> {
  try {
    const { data } = await supabase
      .from('error_logs')
      .select('type, spanish, english, note, count, status')
      .eq('user_id', userId)
      .in('status', ['active', 'improved'])
      .order('count', { ascending: false })
      .limit(limit);

    return (data ?? [])
      .filter((r) => r.spanish && r.english)
      .map((r) => ({
        kind: 'error' as const,
        errorType: r.type ?? 'grammar',
        spanish: r.spanish ?? '',
        english: r.english ?? '',
        note: r.note ?? '',
        count: r.count ?? 1,
      }));
  } catch (err) {
    console.warn('[queue-loader] top mistakes lookup failed:', err);
    return [];
  }
}

export async function loadDueReviewItems(
  supabase: SupabaseClient,
  userId: string,
  options: LoadOptions = {}
): Promise<{ vocab: DueVocabItem[]; errors: DueErrorItem[] }> {
  const vocabLimit = options.vocabLimit ?? DEFAULT_VOCAB_LIMIT;
  const errorLimit = options.errorLimit ?? DEFAULT_ERROR_LIMIT;
  const now = new Date().toISOString();

  const vocab: DueVocabItem[] = [];
  const errors: DueErrorItem[] = [];

  try {
    const { data: vocabRows } = await supabase
      .from('vocab_progress')
      .select(
        `
        interval_days,
        successes,
        failures,
        next_due,
        vocabulary:vocab_id (
          spanish,
          english
        )
      `
      )
      .eq('user_id', userId)
      .lte('next_due', now)
      .order('next_due', { ascending: true })
      .limit(vocabLimit);

    for (const row of vocabRows ?? []) {
      const v = Array.isArray(row.vocabulary) ? row.vocabulary[0] : row.vocabulary;
      if (!v?.spanish) continue;
      vocab.push({
        kind: 'vocab',
        spanish: v.spanish,
        english: v.english ?? '',
        intervalDays: row.interval_days ?? 1,
        successes: row.successes ?? 0,
        failures: row.failures ?? 0,
      });
    }
  } catch (err) {
    console.warn('[queue-loader] vocab lookup failed:', err);
  }

  try {
    const { data: errorRows } = await supabase
      .from('error_logs')
      .select('type, spanish, english, note, count, next_due, status')
      .eq('user_id', userId)
      .in('status', ['active', 'improved'])
      .gte('count', 2)
      .lte('next_due', now)
      .order('next_due', { ascending: true })
      .limit(errorLimit);

    for (const row of errorRows ?? []) {
      errors.push({
        kind: 'error',
        errorType: row.type ?? 'grammar',
        spanish: row.spanish ?? '',
        english: row.english ?? '',
        note: row.note ?? '',
        count: row.count ?? 2,
      });
    }
  } catch (err) {
    console.warn('[queue-loader] error lookup failed:', err);
  }

  return { vocab, errors };
}

/**
 * Format the vocabulary retrieval-sprint block for the AI prompt.
 * Students will hear these recycled at lesson open; errors go in their own
 * block (formatMistakeBlock) so the AI can treat them as silent recycling
 * rather than a retrieval drill the student can see.
 */
export function formatRetrievalSprintBlock(
  due: { vocab: DueVocabItem[]; errors: DueErrorItem[] }
): string {
  if (due.vocab.length === 0) return '';

  const vocabLines = due.vocab.map(
    (v, i) =>
      `  ${i + 1}. "${v.spanish}" — "${v.english}" (successes=${v.successes}, failures=${v.failures})`
  );

  return `
---
### OPENING RETRIEVAL SPRINT (MANDATORY — do this in the first 60 seconds of the lesson)

These vocabulary items are DUE for review today. BEFORE introducing any new content:

${vocabLines.join('\n')}

RULES:
- Recycle each item in a FRESH sentence relevant to today's lesson or the student's profile. Do NOT ask "do you remember X?" in isolation.
- After the student produces (or fails to produce) each item, call the \`mark_item_reviewed\` tool with { kind: "vocab", spanish, performance: "again"|"hard"|"good"|"easy" } to advance the SM-2 state.
- Budget ~10-15 seconds per item, ~60 seconds total.
`.trim();
}

/**
 * Format the persistent mistake-recycling block. Unlike the retrieval sprint
 * (which is an explicit opening ritual), this is silent scaffolding: the AI
 * weaves corrected forms into today's regular content without announcing
 * "remember you got this wrong last time".
 */
export function formatMistakeBlock(
  errors: DueErrorItem[]
): string {
  if (errors.length === 0) return '';

  const errorLines = errors.map(
    (e, i) =>
      `  ${i + 1}. [${e.errorType}] student\'s error form: "${e.spanish}" → correct form: "${e.english}".${e.note ? ` ${e.note}` : ''} (persistence: ${e.count}×)`
  );

  return `
---
### COSAS PARA REPASAR (silent recycling)

These are the student's most persistent mistakes as currently logged. SILENTLY weave the CORRECT forms into today's content — examples, model sentences, corrections. Do NOT announce "remember you struggled with this" or narrate your strategy. Just make sure the corrected form appears naturally in context.

${errorLines.join('\n')}

When the student successfully produces the corrected form (in any context), call \`mark_item_reviewed\` with { kind: "error", spanish: "<error-form>", performance: "good" | "easy" }. If the student reproduces the same error, call with performance: "again".
`.trim();
}
