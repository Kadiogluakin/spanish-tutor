// Shared heuristics used by both the review queue (client) and the review
// preview card (client). Kept in one place so the two can never drift apart.

/** Is this next_focus string concrete enough to be worth drilling on? */
export function isSpecificFocusArea(focus: string): boolean {
  if (!focus) return false;
  const focusLower = focus.toLowerCase();

  const genericPhrases = [
    'mejorar la gramática',
    'mejorar el vocabulario',
    'practicar más',
    'estudiar más',
    'mejorar la pronunciación',
    'ser más específico',
    'usar más palabras',
    'especially',
    'especialmente en la conjugación de verbos',
  ];

  const hasGenericPhrase = genericPhrases.some((p) => focusLower.includes(p));
  if (hasGenericPhrase && focus.length > 50) return false;

  const specificPhrases = [
    'ser vs estar',
    'por vs para',
    'subjunctive',
    'preterite',
    'imperfect',
    'agreement',
    'gender',
    'tilde',
    'accent',
  ];
  if (specificPhrases.some((p) => focusLower.includes(p))) return true;

  return focus.length < 40;
}

/** Is this correction string so vague it's not worth surfacing as a card? */
export function isGenericCorrection(correction: string): boolean {
  if (!correction || correction.length < 10) return true;
  const genericPhrases = [
    'check your grammar',
    'use correct verb form',
    'be more specific',
    'add more details',
    'improve vocabulary',
  ];
  const correctionLower = correction.toLowerCase();
  return genericPhrases.some((p) => correctionLower.includes(p));
}

/**
 * Parse an srs_add entry (e.g. `calentar (to heat up)`) into a Spanish word and
 * its English translation. Returns null when we cannot confidently extract
 * both parts, so callers can skip the item instead of fabricating a prompt.
 */
export function parseHomeworkVocab(
  raw: string
): { spanish: string; english: string } | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/^["'`]|["'`]$/g, '').trim();

  const parenMatch = trimmed.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
  if (parenMatch) {
    const spanish = parenMatch[1].trim();
    const english = parenMatch[2].trim();
    if (spanish && english) return { spanish, english };
  }

  const separatorMatch = trimmed.match(/^(.+?)\s*[-=:\u2013\u2014]\s*(.+)$/);
  if (separatorMatch) {
    const spanish = separatorMatch[1].trim();
    const english = separatorMatch[2].trim();
    if (spanish && english) return { spanish, english };
  }

  return null;
}

/** Fisher-Yates shuffle (unbiased, unlike `sort(() => Math.random() - 0.5)`). */
export function shuffle<T>(array: readonly T[]): T[] {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
