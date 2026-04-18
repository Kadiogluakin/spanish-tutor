// Central registry of skill codes, display names, and practice prompts.
// Any subsystem that writes to `skill_progress` or renders skill cards should
// use these helpers so the review queue has something meaningful to show.

type SkillMeta = {
  label: string;
  labelEs: string;
  prompt: string;
  promptEs: string;
};

const SKILL_REGISTRY: Record<string, SkillMeta> = {
  grammar: {
    label: 'Spanish Grammar',
    labelEs: 'Gramática española',
    prompt:
      'Conjugate a verb in the tense you struggled with most this week. Say it aloud in a full sentence.',
    promptEs:
      'Conjuga un verbo en el tiempo que te cueste más esta semana. Dilo en una oración completa.',
  },
  grammar_accuracy: {
    label: 'Grammar Accuracy',
    labelEs: 'Precisión gramatical',
    prompt:
      'Write one sentence that uses the grammar rule you got wrong most recently, then re-say it with the correction.',
    promptEs:
      'Escribe una oración que use la regla gramatical en la que te equivocaste recientemente y dila con la corrección.',
  },
  vocabulary: {
    label: 'Vocabulary',
    labelEs: 'Vocabulario',
    prompt:
      'Recall three words from your most recent lesson without looking. Use each in a new sentence.',
    promptEs:
      'Recuerda tres palabras de tu última lección sin mirar. Usa cada una en una oración nueva.',
  },
  vocabulary_range: {
    label: 'Vocabulary Range',
    labelEs: 'Riqueza de vocabulario',
    prompt:
      'Take a simple sentence and rewrite it twice using more precise or advanced vocabulary.',
    promptEs:
      'Toma una oración simple y reescríbela dos veces con vocabulario más preciso o avanzado.',
  },
  pronunciation: {
    label: 'Pronunciation',
    labelEs: 'Pronunciación',
    prompt:
      'Read this aloud, paying attention to rolled r and vowel clarity: "El perro corre rápidamente por la ribera."',
    promptEs:
      'Lee en voz alta, cuidando la r vibrante y las vocales: "El perro corre rápidamente por la ribera."',
  },
  fluency: {
    label: 'Conversational Fluency',
    labelEs: 'Fluidez conversacional',
    prompt:
      'Speak for 30 seconds about what you did yesterday without pausing. Record yourself if you can.',
    promptEs:
      'Habla 30 segundos sobre lo que hiciste ayer sin hacer pausas. Grábate si puedes.',
  },
  oral_fluency: {
    label: 'Oral Fluency',
    labelEs: 'Fluidez oral',
    prompt:
      'Describe the room you are in out loud for one minute, using connectors (además, entonces, porque).',
    promptEs:
      'Describe en voz alta la habitación donde estás durante un minuto, usando conectores (además, entonces, porque).',
  },
  written_expression: {
    label: 'Written Expression',
    labelEs: 'Expresión escrita',
    prompt:
      'Write three sentences on today\'s weather. Make sure each one uses a different verb tense.',
    promptEs:
      'Escribe tres oraciones sobre el clima de hoy. Asegúrate de que cada una use un tiempo verbal distinto.',
  },
  conversation_skills: {
    label: 'Conversation Skills',
    labelEs: 'Habilidades de conversación',
    prompt:
      'Imagine ordering a meal in Spanish. Speak both the customer\'s and waiter\'s lines aloud.',
    promptEs:
      'Imagina que pides comida en español. Di en voz alta las frases del cliente y del camarero.',
  },
  verb_conjugation: {
    label: 'Verb Conjugation',
    labelEs: 'Conjugación verbal',
    prompt:
      'Conjugate "tener", "hacer", and "ir" in the preterite — yo, tú, él/ella — out loud.',
    promptEs:
      'Conjuga "tener", "hacer" e "ir" en pretérito — yo, tú, él/ella — en voz alta.',
  },
};

export function getSkillLabel(skillCode: string): string {
  return SKILL_REGISTRY[skillCode]?.labelEs ?? skillCode.replace(/_/g, ' ');
}

export function getSkillLabelEn(skillCode: string): string {
  return SKILL_REGISTRY[skillCode]?.label ?? skillCode.replace(/_/g, ' ');
}

export function getSkillPrompt(skillCode: string): {
  prompt: string;
  promptEs: string;
} {
  const meta = SKILL_REGISTRY[skillCode];
  if (meta) return { prompt: meta.prompt, promptEs: meta.promptEs };
  return {
    prompt: `Practice this skill out loud for one minute: ${skillCode.replace(/_/g, ' ')}.`,
    promptEs: `Practica esta habilidad en voz alta durante un minuto: ${skillCode.replace(/_/g, ' ')}.`,
  };
}

/** Known skill codes so we can exclude legacy `error_<uuid>` rows. */
export function isRealSkillCode(skillCode: string): boolean {
  if (!skillCode) return false;
  if (skillCode.startsWith('error_')) return false;
  return true;
}
