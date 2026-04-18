#!/usr/bin/env node
/*
 * Seed task-based scenarios onto existing lessons in the `lessons` table.
 *
 * Strategy: we don't replace the grammar-topic curriculum. We just enrich
 * each lesson's `content_refs.scenario` JSONB subfield with a role-play
 * scenario that gives today's grammar a real-world reason to exist.
 *
 * Mapping is by keyword against the lesson title; lessons whose title
 * doesn't match any scenario keyword are left untouched (the runtime
 * scenario resolver in src/lib/scenarios.ts will fall back to the first
 * scenario for the sub-level anyway).
 *
 * Usage: node scripts/seed-scenarios.js
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.'
  );
  process.exit(1);
}

function supabaseRefFromUrl(urlString) {
  try {
    const host = new URL(urlString).hostname;
    const [sub] = host.split('.');
    return sub || null;
  } catch {
    return null;
  }
}

function supabaseRefFromServiceJwt(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(json);
    return payload.ref || null;
  } catch {
    return null;
  }
}

const urlRef = supabaseRefFromUrl(SUPABASE_URL);
const keyRef = supabaseRefFromServiceJwt(SERVICE_KEY);
if (urlRef && keyRef && urlRef !== keyRef) {
  console.error(
    `Supabase project mismatch: NEXT_PUBLIC_SUPABASE_URL is for "${urlRef}" ` +
      `but SUPABASE_SERVICE_ROLE_KEY is for "${keyRef}". ` +
      'In the Supabase dashboard, open the project that matches this URL, then Settings → API, and paste the new service_role key into SUPABASE_SERVICE_ROLE_KEY (and update the anon key if the app uses it).'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Mirror src/lib/scenarios.ts SCENARIOS_BY_SUBLEVEL, kept in JS here so this
// file runs without the TS build. Keep them in sync by convention.
const SCENARIOS = {
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

const KEYWORD_MAP = [
  { keywords: ['saludo', 'presenta', 'greeting'], subLevel: 'A1.1', index: 0 },
  { keywords: ['vecino', 'encuentro'], subLevel: 'A1.1', index: 1 },
  { keywords: ['comida', 'panader', 'restauran', 'café', 'ordenar', 'orden'], subLevel: 'A1.2', index: 0 },
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

function subLevelFor(cefr, unit) {
  const u = Number(unit) || 1;
  if (cefr === 'A1') {
    if (u <= 2) return 'A1.1';
    if (u <= 5) return 'A1.2';
    return 'A1.3';
  }
  if (cefr === 'A2') {
    if (u <= 3) return 'A2.1';
    return 'A2.2';
  }
  return cefr;
}

function pickScenario(cefr, unit, title, objectives) {
  const subLevel = subLevelFor(cefr, unit);
  const haystack = [title || '', ...(objectives || [])]
    .join(' ')
    .toLowerCase();

  for (const m of KEYWORD_MAP) {
    if (m.subLevel !== subLevel) continue;
    if (m.keywords.some((kw) => haystack.includes(kw))) {
      const list = SCENARIOS[m.subLevel];
      if (list && list[m.index]) return list[m.index];
    }
  }
  const list = SCENARIOS[subLevel];
  return list && list.length ? list[0] : null;
}

async function main() {
  console.log('Fetching lessons...');
  const { data: lessons, error } = await supabase.from('lessons').select('*');
  if (error) {
    console.error('Error fetching lessons:', error);
    process.exit(1);
  }

  let updated = 0;
  let skipped = 0;

  for (const lesson of lessons) {
    const contentRefs = lesson.content_refs || {};
    const scenario = pickScenario(
      lesson.cefr,
      contentRefs.unit,
      lesson.title,
      lesson.objectives
    );
    if (!scenario) {
      skipped++;
      continue;
    }

    const newContentRefs = { ...contentRefs, scenario };
    const { error: updateError } = await supabase
      .from('lessons')
      .update({ content_refs: newContentRefs })
      .eq('id', lesson.id);

    if (updateError) {
      console.error(`Failed to update ${lesson.id}:`, updateError);
      continue;
    }
    updated++;
    console.log(`  ✓ ${lesson.id} → "${scenario.title}"`);
  }

  console.log(`\nDone. Updated ${updated}, skipped ${skipped}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
