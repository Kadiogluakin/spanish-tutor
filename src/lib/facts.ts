// Helpers around the user_facts table. Kept separate from user_profiles
// because facts are continuously appended by the AI via the
// remember_student_fact tool, whereas profile fields are explicitly managed
// in the SettingsPage.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface StudentFact {
  key: string;
  value: string;
  updatedAt: string;
}

/**
 * Load the N most recently updated facts for a user. Returns an empty array
 * if the table doesn't exist (migration not yet applied) or on any error —
 * facts are purely additive context, never required for a lesson to work.
 */
export async function loadRecentFacts(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<StudentFact[]> {
  try {
    const { data, error } = await supabase
      .from('user_facts')
      .select('key, value, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Common case on first deploy: table doesn't exist yet. Don't spam
      // the console; downgrade to a one-shot warn.
      if (error.code === '42P01') {
        console.warn('[facts] user_facts table not found — run user-facts-migration.sql');
        return [];
      }
      console.warn('[facts] load error:', error);
      return [];
    }

    return (data ?? []).map((r: { key: string; value: string; updated_at: string }) => ({
      key: r.key,
      value: r.value,
      updatedAt: r.updated_at,
    }));
  } catch (err) {
    console.warn('[facts] load exception:', err);
    return [];
  }
}

/**
 * Format a set of facts as a Spanish/English prompt block. The block is
 * short and uses English for the key (stable identifier) and the value
 * (which may be in any language the student chose). The AI is instructed
 * to weave the facts into examples, not to enumerate them to the student.
 */
export function formatFactsBlock(facts: StudentFact[]): string {
  if (facts.length === 0) return '';

  const lines = facts.map((f) => `  - ${f.key}: ${f.value}`);

  return `
---
### HECHOS PERSONALES RECORDADOS (narrative continuity)

Estos son hechos que el estudiante te contó en sesiones previas. REFERENCIALOS NATURALMENTE en ejemplos y preguntas (no los recites como lista). Ejemplo: si "pet: dog named Luna" está acá, decí "Luna, tu perra, ¿es juguetona?" en lugar de usar un "perro" genérico.

${lines.join('\n')}

Si el estudiante comparte algo nuevo y durable (no estados transitorios como "estoy cansado"), llamá \`remember_student_fact({ key, value })\` para guardarlo.
`.trim();
}
