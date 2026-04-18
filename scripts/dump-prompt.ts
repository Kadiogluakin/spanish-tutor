#!/usr/bin/env tsx
/*
 * Offline smoke test: build the lesson system prompt for a fixture
 * A1.1 / Unit 1 / Lesson 1 user and print it to stdout.
 *
 * Run with:
 *   npx tsx scripts/dump-prompt.ts
 *
 * We don't hit Supabase here — prompts and scenarios are built directly
 * from the pure modules so we can eyeball the assembled output.
 */

import {
  getPersonaPrompt,
  getPedagogyPrompt,
  getErrorCorrectionPrompt,
  getNotebookPrompt,
  getWritingExercisePrompt,
  getWritingExerciseFeedbackPrompt,
  getLevelSpecificRules,
  getFirstResponsePrompt,
  getEffectiveSubLevel,
  getDrillRulesPrompt,
} from '../src/lib/prompts';
import {
  formatMistakeBlock,
  formatRetrievalSprintBlock,
} from '../src/lib/review/queue-loader';
import {
  formatScenarioBlock,
  getScenarioForLesson,
} from '../src/lib/scenarios';
import { formatFactsBlock } from '../src/lib/facts';

const cefr = 'A1';
const unit = 1;
const lesson = 1;
const title = 'Saludos y Presentaciones';
const objectives = ['Greet people', 'Introduce yourself', 'Basic courtesy'];
const subLevel = getEffectiveSubLevel(cefr, unit);

const scenario = getScenarioForLesson({
  subLevel,
  title,
  objectives,
});

const retrievalSprintBlock = formatRetrievalSprintBlock({
  vocab: [
    {
      kind: 'vocab',
      spanish: 'hola',
      english: 'hello',
      intervalDays: 1,
      successes: 1,
      failures: 0,
    },
    {
      kind: 'vocab',
      spanish: 'gracias',
      english: 'thank you',
      intervalDays: 1,
      successes: 0,
      failures: 1,
    },
  ],
  errors: [],
});

const mistakeBlock = formatMistakeBlock([
  {
    kind: 'error',
    errorType: 'grammar',
    spanish: 'yo gusta',
    english: 'me gusta',
    note: 'Use me/te/le with gustar.',
    count: 3,
  },
]);

const factsBlock = formatFactsBlock([
  { key: 'pet', value: 'dog named Luna', updatedAt: new Date().toISOString() },
]);

const prompt = `
${getPersonaPrompt(subLevel)}

---
LECCIÓN ACTUAL: "${title}" (Nivel ${cefr}, Sub-nivel ${subLevel}, Unidad ${unit}, Lección ${lesson})
OBJETIVOS: ${objectives.join(', ')}
DURACIÓN ESTIMADA: 30 minutos
MODO DE LA CLASE: CLASE COMPLETA — ~30 min, 6+ conceptos, incluye lectura corta
POSICIÓN DEL ESTUDIANTE: Absolute beginner (CEFR A1.1, Unit 1 Lesson 1). Assume the student does NOT speak Spanish yet.

${factsBlock}

${scenario ? formatScenarioBlock(scenario) : ''}

${retrievalSprintBlock}

${mistakeBlock}

---
### INSTRUCCIONES DE ENSEÑANZA
- Foco, un concepto a la vez, etc.

${getLevelSpecificRules(subLevel)}
${getPedagogyPrompt()}
${getErrorCorrectionPrompt()}
${getNotebookPrompt()}
${getWritingExercisePrompt(subLevel)}
${getWritingExerciseFeedbackPrompt()}
${getDrillRulesPrompt(subLevel)}
${getFirstResponsePrompt(subLevel)}
`;

console.log(prompt);
console.log('\n\n--- END OF PROMPT ---');
console.log(`Sub-level: ${subLevel}`);
console.log(`Length: ${prompt.length} chars`);
