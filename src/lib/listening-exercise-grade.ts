import type { RequestListeningExerciseArgs } from '@/lib/realtime-tools';

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenSet(s: string): Set<string> {
  const n = normalize(s);
  if (!n) return new Set();
  return new Set(n.split(' ').filter((w) => w.length > 1));
}

/** Jaccard similarity on word sets (0–1). */
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) {
    if (b.has(w)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Which option id is "the" correct key for UI highlight, given the model may
 * have sent an id, a label, or a paraphrase in correctAnswer.
 */
export function resolveWinningOptionId(
  exercise: RequestListeningExerciseArgs
): string | null {
  const options = exercise.options ?? [];
  if (options.length === 0) return null;
  const key = exercise.correctAnswer.trim();

  const byId = options.find(
    (o) => o.id === key || o.id.toLowerCase() === key.toLowerCase()
  );
  if (byId) return byId.id;

  const nk = normalize(key);
  for (const o of options) {
    if (normalize(o.label) === nk) return o.id;
  }
  for (const o of options) {
    if (jaccard(tokenSet(key), tokenSet(o.label)) >= 0.45) return o.id;
  }
  return null;
}

export function gradeListeningAnswer(
  exercise: RequestListeningExerciseArgs,
  selectedId: string | null,
  typedAnswer: string
): boolean {
  const expectedRaw = exercise.correctAnswer.trim();
  const options = exercise.options ?? [];

  if (options.length > 0) {
    if (!selectedId) return false;
    const winning = resolveWinningOptionId(exercise);
    if (winning && selectedId === winning) return true;

    const selected = options.find((o) => o.id === selectedId);
    if (!selected) return false;

    const ne = normalize(expectedRaw);
    const nl = normalize(selected.label);
    if (ne && nl && ne === nl) return true;

    if (ne.length >= 12 && nl.length >= 12) {
      const jc = jaccard(tokenSet(expectedRaw), tokenSet(selected.label));
      if (jc >= 0.45) return true;
      if (
        ne.includes(nl.slice(0, Math.min(24, nl.length))) ||
        nl.includes(ne.slice(0, Math.min(24, ne.length)))
      ) {
        return true;
      }
    }

    return false;
  }

  // Free-text: overlap / contains
  const got = normalize(typedAnswer);
  const want = normalize(expectedRaw);
  if (!got || !want) return false;
  if (got === want) return true;
  if (got.includes(want) || want.includes(got)) return true;
  return jaccard(tokenSet(typedAnswer), tokenSet(expectedRaw)) >= 0.5;
}
