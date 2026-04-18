// Task-based scenario overlays for the existing grammar-topic curriculum.
//
// Why: traditional grammar lessons ("The Conditional") teach form without
// communicative purpose, which undermines retention. Overlaying each lesson
// with a real-world scenario ("Plan a hypothetical weekend with a porteño
// friend, using 'si tuviera tiempo...'") gives the grammar a reason to
// exist in the student's head.
//
// How: scenarios are stored per-lesson in `lessons.content_refs.scenario`
// (JSONB). They may also be authored centrally in this module (see
// scripts/seed-scenarios.js which populates the DB). The getScenarioForLesson
// helper prefers the DB value but falls back to this module's map for
// lessons that haven't been seeded yet.
//
// All content is in Argentine Spanish with voseo as per the app's persona.

export interface Scenario {
  // Short, student-friendly scenario title in Spanish.
  title: string;
  // One-sentence set-up in Spanish (who, where, what).
  setup: string;
  // Communicative goal of the exchange, in Spanish.
  goal: string;
  // Role assignments for the role-play.
  roles: {
    ai: string; // e.g. "tu amigo porteño"
    student: string; // e.g. "vos mismo"
  };
  // Concrete success criteria (AI uses these to decide when the scenario
  // has been satisfied).
  successCriteria: string[];
}

// Curated scenarios per sub-level. Each is mapped below to likely lesson
// topics by fuzzy title match. The list is deliberately short and quality-
// focused; add more via scripts/seed-scenarios.js when curriculum needs it.
export const SCENARIOS_BY_SUBLEVEL: Record<string, Scenario[]> = {
  'A1.1': [
    {
      title: 'Primer encuentro en un café porteño',
      setup: 'Entrás a un café en Palermo y el mozo te saluda.',
      goal: 'Saludar, presentarte con tu nombre, y despedirte cordialmente.',
      roles: { ai: 'el mozo del café', student: 'vos mismo, turista recién llegado' },
      successCriteria: [
        'El estudiante produce "hola" y "me llamo ___"',
        'El estudiante produce una despedida ("chau" o "gracias")',
      ],
    },
    {
      title: 'Conocer a un vecino',
      setup: 'Te cruzás con un vecino en el ascensor del edificio.',
      goal: 'Saludar e intercambiar nombres.',
      roles: { ai: 'la vecina del departamento de al lado', student: 'vos, recién mudado' },
      successCriteria: [
        'El estudiante dice "hola" y "mucho gusto"',
        'El estudiante entiende "¿cómo te llamás?"',
      ],
    },
  ],

  'A1.2': [
    {
      title: 'Pedir en una panadería',
      setup: 'Estás en la panadería del barrio y querés comprar facturas.',
      goal: 'Pedir "dos medialunas y un café con leche" usando números y "por favor".',
      roles: { ai: 'la panadera', student: 'vos, cliente' },
      successCriteria: [
        'El estudiante pide con "quisiera ___" o "me da ___"',
        'El estudiante usa un número (uno, dos, tres)',
        'El estudiante dice "gracias" al final',
      ],
    },
    {
      title: 'Hablar de la familia',
      setup: 'Un amigo argentino te pregunta por tu familia mientras tomás unos mates.',
      goal: 'Describir miembros de la familia básicos (padre, madre, hermano/a).',
      roles: { ai: 'tu nuevo amigo argentino', student: 'vos mismo' },
      successCriteria: [
        'El estudiante nombra al menos dos familiares',
        'El estudiante usa "tengo ___" o "mi ___ se llama ___"',
      ],
    },
  ],

  'A1.3': [
    {
      title: 'Planear un encuentro con un amigo',
      setup: 'Tu amigo porteño te propone hacer algo este sábado.',
      goal: 'Proponer un lugar y una hora usando presente simple y "vamos a ___".',
      roles: { ai: 'tu amigo porteño', student: 'vos mismo' },
      successCriteria: [
        'El estudiante propone un lugar concreto',
        'El estudiante usa "vamos a ___" o una pregunta con "querés ___"',
      ],
    },
    {
      title: 'Contar un día típico',
      setup: 'Estás conociendo a alguien y te pregunta cómo es tu día.',
      goal: 'Describir una rutina diaria con verbos reflexivos básicos (levantarse, bañarse, desayunar).',
      roles: { ai: 'una persona curiosa que acabás de conocer', student: 'vos mismo' },
      successCriteria: [
        'El estudiante usa al menos dos verbos reflexivos en primera persona',
        'El estudiante menciona una hora',
      ],
    },
  ],

  'A2.1': [
    {
      title: 'Recomendar un lugar en Buenos Aires',
      setup: 'Un turista te pide consejos sobre qué ver en la ciudad.',
      goal: 'Recomendar lugares usando "te recomiendo ___" y justificar por qué.',
      roles: { ai: 'un turista europeo curioso', student: 'vos, porteño local' },
      successCriteria: [
        'El estudiante hace dos recomendaciones concretas',
        'El estudiante usa "porque ___" para justificar al menos una',
      ],
    },
    {
      title: 'Contar una anécdota del fin de semana',
      setup: 'Es lunes y un compañero te pregunta cómo estuvo tu fin de semana.',
      goal: 'Narrar una anécdota corta en pretérito (fui, vi, comí).',
      roles: { ai: 'un compañero de trabajo', student: 'vos mismo' },
      successCriteria: [
        'El estudiante usa al menos tres verbos en pretérito',
        'La anécdota tiene principio, medio y final',
      ],
    },
  ],

  'A2.2': [
    {
      title: 'Resolver un problema en el alquiler',
      setup: 'La heladera de tu departamento alquilado dejó de funcionar y llamás al dueño.',
      goal: 'Explicar el problema y negociar una solución usando condicional y subjuntivo básico.',
      roles: { ai: 'el dueño del departamento', student: 'vos, inquilino' },
      successCriteria: [
        'El estudiante describe el problema con precisión',
        'El estudiante propone una solución con "¿podrías ___?" o "sería posible ___"',
      ],
    },
    {
      title: 'Planear una hipotética mudanza',
      setup: 'Un amigo te pregunta qué harías si te mudaras al interior.',
      goal: 'Hablar de situaciones hipotéticas con condicional ("si tuviera, iría ___").',
      roles: { ai: 'un amigo curioso', student: 'vos mismo' },
      successCriteria: [
        'El estudiante usa al menos dos cláusulas condicionales completas',
        'El estudiante justifica su elección',
      ],
    },
  ],

  B1: [
    {
      title: 'Debate sobre trabajo remoto',
      setup: 'En una charla de café surge el tema del trabajo remoto.',
      goal: 'Defender o criticar el trabajo remoto con argumentos estructurados.',
      roles: { ai: 'un colega con opinión contraria', student: 'vos mismo' },
      successCriteria: [
        'El estudiante da al menos dos argumentos con conectores (además, sin embargo, por lo tanto)',
        'El estudiante responde a un contraargumento',
      ],
    },
  ],

  B2: [
    {
      title: 'Entrevista de trabajo en una startup porteña',
      setup: 'Estás en una entrevista para un puesto senior.',
      goal: 'Hablar de tu experiencia y proponer ideas usando subjuntivo y condicional.',
      roles: { ai: 'la entrevistadora', student: 'vos, candidato' },
      successCriteria: [
        'El estudiante narra una experiencia laboral con tiempos verbales variados',
        'El estudiante hace una propuesta con "si tuviera ___ haría ___" o equivalente',
      ],
    },
  ],

  C1: [
    {
      title: 'Mesa redonda sobre política lingüística',
      setup: 'Participás en una mesa sobre el uso del voseo en la educación formal.',
      goal: 'Argumentar matices y contradecir con cortesía académica.',
      roles: { ai: 'otro panelista', student: 'vos mismo' },
      successCriteria: [
        'El estudiante usa al menos tres conectores avanzados',
        'El estudiante matiza una postura con subjuntivo pasado',
      ],
    },
  ],
};

// Keywords used to match a scenario to a lesson by title/objective.
// This is intentionally shallow — for precision, override via content_refs.scenario.
const SCENARIO_KEYWORDS: Array<{ keywords: string[]; subLevel: string; index: number }> = [
  { keywords: ['saludo', 'presenta', 'greeting'], subLevel: 'A1.1', index: 0 },
  { keywords: ['vecino', 'encuentro', 'presentación'], subLevel: 'A1.1', index: 1 },
  { keywords: ['comida', 'panadería', 'restaurante', 'café', 'ordenar', 'orden'], subLevel: 'A1.2', index: 0 },
  { keywords: ['familia'], subLevel: 'A1.2', index: 1 },
  { keywords: ['plan', 'fin de semana', 'cita'], subLevel: 'A1.3', index: 0 },
  { keywords: ['rutina', 'día', 'reflex'], subLevel: 'A1.3', index: 1 },
  { keywords: ['recomenda', 'ciudad', 'lugar'], subLevel: 'A2.1', index: 0 },
  { keywords: ['pasado', 'pretérito', 'anécdota', 'contar'], subLevel: 'A2.1', index: 1 },
  { keywords: ['problem', 'alquil', 'reclamo'], subLevel: 'A2.2', index: 0 },
  { keywords: ['hipotét', 'condicional'], subLevel: 'A2.2', index: 1 },
  { keywords: ['debate', 'opinión', 'trabajo'], subLevel: 'B1', index: 0 },
  { keywords: ['entrevista', 'profesional'], subLevel: 'B2', index: 0 },
  { keywords: ['política', 'argumenta'], subLevel: 'C1', index: 0 },
];

/**
 * Resolve a Scenario for a lesson. Prefers a scenario pre-authored in
 * `content_refs.scenario`; otherwise falls back to a fuzzy match against
 * the scenario library keyed on the lesson's sub-level + topic keywords.
 */
export function getScenarioForLesson(params: {
  subLevel: string;
  title?: string;
  objectives?: string[];
  scenarioFromDb?: unknown;
}): Scenario | null {
  const { subLevel, title = '', objectives = [], scenarioFromDb } = params;

  // 1. DB-authored scenario wins if it looks structurally valid.
  if (isScenarioLike(scenarioFromDb)) {
    return scenarioFromDb as Scenario;
  }

  // 2. Fuzzy keyword match against the scenario library.
  const haystack = [title, ...objectives]
    .filter((s): s is string => typeof s === 'string')
    .join(' ')
    .toLowerCase();

  for (const match of SCENARIO_KEYWORDS) {
    if (match.subLevel !== subLevel) continue;
    if (match.keywords.some((kw) => haystack.includes(kw))) {
      const list = SCENARIOS_BY_SUBLEVEL[match.subLevel];
      if (list && list[match.index]) return list[match.index];
    }
  }

  // 3. As a last resort, any scenario from the same sub-level is better than
  // none — use the first one.
  const list = SCENARIOS_BY_SUBLEVEL[subLevel];
  if (list && list.length > 0) return list[0];

  return null;
}

function isScenarioLike(v: unknown): v is Scenario {
  if (!v || typeof v !== 'object') return false;
  const s = v as Partial<Scenario>;
  return (
    typeof s.title === 'string' &&
    typeof s.setup === 'string' &&
    typeof s.goal === 'string' &&
    typeof s.roles === 'object' &&
    s.roles !== null &&
    typeof (s.roles as Scenario['roles']).ai === 'string' &&
    typeof (s.roles as Scenario['roles']).student === 'string'
  );
}

/**
 * Format a Scenario as a Spanish prompt block for the AI.
 */
export function formatScenarioBlock(scenario: Scenario): string {
  const criteria = scenario.successCriteria
    .map((c, i) => `  ${i + 1}. ${c}`)
    .join('\n');
  return `
---
### ESCENARIO DE HOY (role-play — esto es el corazón de la clase)

**Situación:** ${scenario.setup}
**Objetivo comunicativo:** ${scenario.goal}
**Roles:**
  - Vos (profesora) sos: ${scenario.roles.ai}
  - El estudiante es: ${scenario.roles.student}

**Criterios de éxito (para saber cuándo el escenario está cumplido):**
${criteria}

Enseñá la gramática/vocabulario del tema DESDE el escenario, no como una lección de libro. Hacé el role-play tan pronto el estudiante tenga los bloques mínimos (puede ser después de la presentación de 1-2 conceptos). El estudiante habla más; vos acompañás y corregís dentro del rol.
`.trim();
}
