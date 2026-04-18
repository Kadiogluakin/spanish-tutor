export const runtime = 'nodejs';

import { createClient } from '@/lib/supabase/server';
import { getLessonOfTheDay } from '@/lib/level-plan-supabase';
import {
  getPersonaPrompt,
  getPedagogyPrompt,
  getErrorCorrectionPrompt,
  getNotebookPrompt,
  getWritingExercisePrompt,
  getWritingExerciseFeedbackPrompt,
  getLevelSpecificRules,
  getFirstResponsePrompt,
  getResumeAfterReconnectPrompt,
  getEffectiveSubLevel,
  getDrillRulesPrompt
} from '@/lib/prompts';
import { REALTIME_TOOLS } from '@/lib/realtime-tools';
import {
  loadDueReviewItems,
  loadTopMistakes,
  formatRetrievalSprintBlock,
  formatMistakeBlock,
} from '@/lib/review/queue-loader';
import {
  getScenarioForLesson,
  formatScenarioBlock,
} from '@/lib/scenarios';
import { loadRecentFacts, formatFactsBlock } from '@/lib/facts';

/**
 * Human-readable description of the student's position in the curriculum.
 * Surfaced in the system prompt so the AI treats "Unit 1 Lesson 1" as a
 * true absolute beginner rather than defaulting to Spanish-primary teaching.
 */
function describeLessonPosition(
  subLevel: string,
  unit: number,
  lesson: number
): string {
  switch (subLevel) {
    case 'A1.1':
      return `Absolute beginner (CEFR ${subLevel}, Unit ${unit} Lesson ${lesson}). Assume the student does NOT speak Spanish yet. Teach in English and introduce Spanish one small chunk at a time.`;
    case 'A1.2':
      return `Early beginner (CEFR ${subLevel}, Unit ${unit} Lesson ${lesson}). Student recognizes a handful of Spanish greetings and classroom phrases but still needs English as the medium of instruction.`;
    case 'A1.3':
      return `Late beginner (CEFR ${subLevel}, Unit ${unit} Lesson ${lesson}). Student can follow simple Spanish routines; explain grammar in English.`;
    case 'A2.1':
      return `Elementary (CEFR ${subLevel}, Unit ${unit} Lesson ${lesson}). Spanish-primary with targeted English only when comprehension breaks.`;
    case 'A2.2':
      return `Upper elementary (CEFR ${subLevel}, Unit ${unit} Lesson ${lesson}). Spanish only in normal circumstances.`;
    default:
      return `CEFR ${subLevel}, Unit ${unit} Lesson ${lesson}.`;
  }
}

/**
 * A short, recency-biased reminder appended at the very end of the system
 * prompt. LLMs weight the last instructions more heavily, so we re-state the
 * single most critical sub-level rule here for A1.1 / A1.2 where the default
 * failure mode is drifting into Spanish-primary teaching.
 */
function getFinalLanguageGuardrail(subLevel: string): string {
  if (subLevel === 'A1.1') {
    return `
---
### FINAL REMINDER (read this last — it overrides any conflicting instinct above)
You are teaching an ABSOLUTE BEGINNER. Speak PRIMARILY IN ENGLISH. Spanish appears only as target content, always immediately followed by an English gloss. Each Spanish utterance ≤ 4 words. All explanations, corrections, encouragement, and transitions: ENGLISH. Do NOT open the lesson in Spanish beyond a single "¡Hola!". If you ever notice you've strung together more than 4 Spanish words in a row without glossing, stop and restate in English.
- **Never** pivot into a Spanish-only recap ("Ahora repasamos…", "Ya conocés…", "Si tenés alguna pregunta…") — that is ALWAYS wrong at A1.1, even if it sounds encouraging. After short student replies like "ok", your next turn must continue teaching in **English** with the next micro-activity — not a recap paragraph in Spanish.
- A few successful repetitions of "hola" / "me llamo" / "chau" does **not** mean the lesson objective is done. Keep going with more practice and mandatory tools until the system allows end-of-lesson.
- **Never** say "hasta luego", "see you later", "great job today", or "you've learned X/Y/Z" unless you have **already** received \`allowed: true\` from \`request_end_lesson\` in this session. Otherwise the student thinks the lesson ended but the app did not record completion.
- **Also forbidden without \`allowed: true\`:** "I'm going to close the lesson", "I'll wrap up", "I hope you enjoyed", "if you have any questions let me know", "we can keep practicing another time", "great practicing today" as a dismissal — the app **does not** mark complete. After "ok" / "sure", continue with the **next tool or micro-task**, not a goodbye.
`.trim();
  }
  if (subLevel === 'A1.2') {
    return `
---
### FINAL REMINDER (read this last — it overrides any conflicting instinct above)
You are teaching an EARLY BEGINNER. Default medium of instruction: ENGLISH. Spanish utterances ≤ 6 words. Explanations and corrections in English. Only the short classroom routines (Hola, Muy bien, Perfecto, Repetí, Otra vez, Tu turno, Gracias) may appear in Spanish without translation.
- Do NOT deliver a long Spanish recap or "lesson summary" monologue — especially after the student says "ok". Recaps belong in English only, and only after \`request_end_lesson\` returns allowed: true.
`.trim();
  }
  if (subLevel === 'A1.3') {
    return `
---
### FINAL REMINDER
Mixed classroom language. Routines in simple Spanish; grammar explanations in English; English gloss the first time each new word appears.
`.trim();
  }
  if (subLevel === 'B1') {
    return `
---
### FINAL REMINDER (read this last — B1)
- **Notebook:** Log every new chunk / connector you teach with \`add_to_notebook\` — empty notebook = bad session.
- **No "infinite future sentence":** After the opening warm-up, **do not** spend many turns only lengthening the same «En el futuro, a mí me gustaría…» line. **Max 2** consecutive turns whose main move is that pattern; then **open a modal** (writing / listening / reading per rules) or switch to another **OBJETIVO**.
- **No fake closure:** Never say you are closing the lesson, "voy a cerrar", "repasamos lo trabajado", or "cualquier cosa avisame" unless \`request_end_lesson\` returned \`allowed: true\`. If the student says **no / basta**, open a **different** exercise — do not verbally end the class.
`.trim();
  }
  return `
---
### FINAL REMINDER (read this last)
This is a **structured lesson** with objectives and time, not open-ended chat. Keep **student output** and **mandatory tools** (writing / listening / reading / pronunciation / fluency as rules require) in the mix; do not let many consecutive turns be only teacher talk or generic advice. Briefly **name the phase** when you move on ("Ahora, práctica escrita…" / "Siguiente punto…"). Tools open the in-class worksheets — do not replace them with long spoken substitutes.
`.trim();
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.REALTIME_MODEL || 'gpt-realtime-gpt-4o-realtime-preview';
  
  console.log('[Token API] Request received');
  
  if (!apiKey) {
    console.error('[Token API] Missing OPENAI_API_KEY');
    return new Response(JSON.stringify({ error: 'Missing OPENAI_API_KEY' }), { status: 500 });
  }

  // Parse request body for custom lesson data and conversation context
  let customLessonData = null;
  let conversationHistory = [];
  let notebookEntries = [];
  try {
    const body = await request.json();
    customLessonData = body.customLessonData;
    conversationHistory = body.conversationHistory || [];
    notebookEntries = body.notebookEntries || [];
    console.log('[Token API] Request body parsed successfully');
  } catch (error) {
    console.log('[Token API] No body or parsing failed, continuing without custom lesson data');
    // If no body or parsing fails, continue without custom lesson data
  }

  // Get current user and their lesson context
  let lessonContext = '';
  // subLevel is set inside the try block once we know which lesson we're
  // running; default to A1.1 so the fallback path also gets the strongest
  // English-scaffolding guardrail rather than accidentally speaking Spanish
  // to a brand-new user whose profile failed to load.
  let subLevel: string = 'A1.1';
  // Retrieval sprint items due today; empty string if no items or the load
  // fails. We never block session creation on the SRS queue.
  let retrievalSprintBlock: string = '';
  // Persistent mistakes to silently recycle; empty if the user has no logged errors.
  let mistakeBlock: string = '';
  // Task-based scenario overlay for today's lesson; empty if no scenario matched.
  let scenarioBlock: string = '';
  // Recent personal facts the student has volunteered; used for narrative continuity.
  let factsBlock: string = '';
  try {
    console.log('[Token API] Creating Supabase client');
    const supabase = await createClient();
    console.log('[Token API] Getting user');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('[Token API] Auth error:', authError);
      throw authError;
    }
    
    if (!user) {
      console.error('[Token API] No user found');
      throw new Error('User not authenticated');
    }
    
    console.log('[Token API] User authenticated:', user.id);
    
    if (user) {
      let currentLesson;
      
      // Use custom lesson data if provided, otherwise get lesson of the day
      if (customLessonData) {
        currentLesson = customLessonData;
        console.log('[Token API] Using custom selected lesson:', currentLesson.title);
      } else {
        console.log('[Token API] Getting lesson of the day for user:', user.id);
        const lessonPlan = await getLessonOfTheDay(user.id);
        currentLesson = lessonPlan.recommendedLesson.lesson;
        console.log('[Token API] Using lesson of the day:', currentLesson.title);
      }
      
      // Build conversation context if exists
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        conversationContext = `
📚 CONTEXTO DE CONVERSACIÓN PREVIA (Session Memory):
Las siguientes son las últimas ${Math.min(conversationHistory.length, 10)} interacciones de esta sesión:

${conversationHistory.slice(-10).map((msg: any, index: number) => 
  `${index + 1}. ${msg.type === 'user' ? 'ESTUDIANTE' : 'VOS (PROFESORA MILAGROS)'}: "${msg.content}"`
).join('\n')}

🚨 INSTRUCCIÓN CRÍTICA DE CONTINUIDAD:
- ESTO ES RECONEXIÓN / MISMA CLASE — NO reinicies la lección desde cero
- **Ignorá el bloque "FIRST RESPONSE"** del system prompt (plantilla de primer saludo del día): ese bloque es solo para sesión **sin** este historial. Acá ya hay historial → seguí la lección en curso.
- Continuá naturalmente desde donde se quedó la conversación
- Mencioná brevemente que seguís ("Seguimos…") pero NO expliques la desconexión técnica
- Si estabas enseñando una palabra o estructura, retomá ahí; si había un modal, no lo abras de nuevo salvo que falte completarlo
- NO repitas escenas de listening completas ni el mismo ejercicio escrito ya entregado
- NO repitas vocabulario ya trabajado salvo retrieval breve
- Mantené el flujo natural de la lección que ya estaba en progreso
`;
      }

      // Build notebook context if exists
      let notebookContext = '';
      if (notebookEntries.length > 0) {
        const vocabularyWords = notebookEntries.map((entry: any) => entry.text).join(', ');
        notebookContext = `
📝 VOCABULARIO YA ENSEÑADO (En el cuaderno):
${vocabularyWords}

🧠 RECICLÁ estas palabras en contexto nuevo durante la lección (NO las omitas). El objetivo es retrieval practice: usalas en oraciones frescas sobre el tema de hoy o el perfil del estudiante, y cuando el estudiante produzca (o fallé en producir) una, llamá \`mark_item_reviewed({ kind: "vocab", spanish, performance })\` para avanzar el estado SM-2.
`;
      }

      // Get user profile for personalization
      let userProfileContext = '';
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          userProfileContext = `
👤 PERFIL DEL ESTUDIANTE (Para Personalización):
${profile.name ? `• Nombre: ${profile.name}` : '• Nombre: No proporcionado'}
${profile.age ? `• Edad: ${profile.age}` : '• Edad: No proporcionada'}
${profile.native_language ? `• Idioma nativo: ${profile.native_language}` : '• Idioma nativo: No proporcionado'}
${profile.occupation ? `• Ocupación: ${profile.occupation}` : '• Ocupación: No proporcionada'}
${profile.location ? `• Ubicación: ${profile.location}` : '• Ubicación: No proporcionada'}
${profile.interests ? `• Intereses: ${profile.interests}` : '• Intereses: No proporcionados'}
${profile.learning_goals ? `• Objetivos de aprendizaje: ${profile.learning_goals}` : '• Objetivos: No proporcionados'}
• Nivel CEFR: ${profile.level_cefr || 'A1'}

🎯 INSTRUCCIONES DE PERSONALIZACIÓN:
- USA el nombre del estudiante cuando lo conozcas
- Haz referencias a sus intereses y ocupación en ejemplos
- Adapta el contenido a su edad y trasfondo cultural
- Si falta información, pregúntala naturalmente durante la conversación
- Usa ejemplos relevantes a su ubicación cuando sea apropiado
`;
        } else {
          userProfileContext = `
👤 PERFIL DEL ESTUDIANTE: No hay información de perfil disponible

🎯 DESCUBRIMIENTO DE PERFIL:
- Pregunta naturalmente sobre su nombre, edad, intereses, ocupación
- Descubre información personal durante la conversación de forma orgánica
- NO hagas una entrevista - descubre información gradualmente
`;
        }
      } catch (profileError) {
        console.error('Error getting user profile:', profileError);
        userProfileContext = `
👤 PERFIL DEL ESTUDIANTE: Error al cargar perfil

🎯 DESCUBRIMIENTO DE PERFIL: Pregunta naturalmente sobre información personal durante la lección
`;
      }

      // Get level-appropriate language instructions
      let userLevel = 'A1';
      let lessonLevel = currentLesson.cefr || 'A1';
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('level_cefr')
          .eq('id', user.id)
          .single();

        userLevel = profile?.level_cefr || 'A1';
        lessonLevel = currentLesson.cefr || 'A1';
      } catch (error) {
        // Fallback to A1 level if profile fetch fails
      }

      // Sub-level granularity MUST follow the **lesson's** CEFR + unit, not
      // max(user, lesson). Otherwise a student placed at B1 who opens A1
      // Lesson 1 gets B1 prompts (e.g. future tense cloze) — wrong scaffolding.
      const lessonUnit: number =
        typeof currentLesson.unit === 'number' && currentLesson.unit > 0
          ? currentLesson.unit
          : 1;
      const lessonIndex: number =
        typeof currentLesson.lesson === 'number' && currentLesson.lesson > 0
          ? currentLesson.lesson
          : 1;
      subLevel = getEffectiveSubLevel(lessonLevel, lessonUnit);

      const persona = getPersonaPrompt();
      const pedagogy = getPedagogyPrompt();
      const errorCorrection = getErrorCorrectionPrompt();
      const notebook = getNotebookPrompt();
      const writingExercise = getWritingExercisePrompt(subLevel);
      const writingFeedback = getWritingExerciseFeedbackPrompt();
      const levelRules = getLevelSpecificRules(subLevel);
      const hasChatMemory =
        Array.isArray(conversationHistory) && conversationHistory.length > 0;
      const openingPrompt = hasChatMemory
        ? getResumeAfterReconnectPrompt(subLevel)
        : getFirstResponsePrompt(subLevel);
      const drillRules = getDrillRulesPrompt(subLevel);

      // Spaced-retrieval opening sprint: pull items due for review today and
      // inject them so the lesson starts with recycling instead of new material.
      const due = await loadDueReviewItems(supabase, user.id);
      retrievalSprintBlock = formatRetrievalSprintBlock(due);

      // Silent mistake recycling: the top persistent mistakes, independent of
      // SRS due date. AI should weave corrected forms into today's content.
      const topMistakes = await loadTopMistakes(supabase, user.id, 5);
      mistakeBlock = formatMistakeBlock(topMistakes);

      // Task-based scenario overlay. Prefers a DB-authored scenario in
      // content_refs.scenario; falls back to the scenario library by sub-level
      // + topic keyword match. Backwards compatible: if no scenario matches,
      // the lesson prompt proceeds in its legacy grammar-topic shape.
      const scenario = getScenarioForLesson({
        subLevel,
        title: currentLesson.title,
        objectives: currentLesson.objectives,
        scenarioFromDb: currentLesson.scenario,
      });
      if (scenario) {
        scenarioBlock = formatScenarioBlock(scenario);
      }

      // Recent personal facts for narrative continuity.
      const facts = await loadRecentFacts(supabase, user.id, 20);
      factsBlock = formatFactsBlock(facts);

      lessonContext = `
${persona}

---
LECCIÓN ACTUAL: "${currentLesson.title}" (Nivel ${currentLesson.cefr}, Sub-nivel ${subLevel}, Unidad ${lessonUnit}, Lección ${lessonIndex})
PERFIL ESTUDIANTE (referencia): nivel declarado en app = ${userLevel} — la **dificultad y el idioma de instrucción** siguen el nivel **de esta lección** (${lessonLevel}), no el del perfil. Si repasan A1, enseñá como A1 aunque el perfil diga B2.
OBJETIVOS: ${currentLesson.objectives?.join(', ') || 'Práctica conversacional'}
DURACIÓN ESTIMADA: ${currentLesson.estimatedDuration || 30} minutos
MODO DE LA CLASE: CLASE COMPLETA — planificá como aula de ~30 min: 6+ conceptos vía \`mark_concept_taught\`, práctica oral sostenida, ejercicios en modales (escritura/escucha/pronunciación/lectura/fluency según nivel), sin atajos ni "versión corta".
POSICIÓN DEL ESTUDIANTE: ${describeLessonPosition(subLevel, lessonUnit, lessonIndex)}

${conversationContext}

${notebookContext}

${userProfileContext}

${factsBlock}

${scenarioBlock}

${retrievalSprintBlock}

${mistakeBlock}

---
### INSTRUCCIONES DE ENSEÑANZA
- **Foco:** Concéntrate exclusivamente en los objetivos de esta lección. No introduzcas temas o vocabulario no relacionados.
- **Un Concepto a la Vez:** Introduce un solo concepto nuevo (palabra, frase, regla) y luego haz que el estudiante lo practique antes de continuar.
- **Guía al Estudiante:** Si el estudiante se desvía, guíalo amablemente de vuelta a los objetivos de la lección.
- **Recycling sobre Repetición ingenua:** Cuando hay items en el OPENING RETRIEVAL SPRINT, reciclálos activamente en oraciones nuevas. El cuaderno ya no es una lista de "no repetir" — es una lista de "reutilizar en contexto nuevo".
- **Ritmo de aula:** Presentación breve → práctica inmediata del estudiante → breve feedback → siguiente micro-paso. No sustituyas tres turnos de práctica con un monólogo explicativo.
- **Cuaderno en vivo:** Cada vez que el foco sea una forma nueva en español, \`add_to_notebook\` debe reflejarlo en pantalla (alta densidad — ver sección NOTEBOOK). Un estudiante sin entradas nuevas en el cuaderno durante minutos = señal de que no estás materializando la clase.
- **Ejercicios en pantalla:** Alterná práctica oral breve con **modales** (\`request_writing_exercise\`, escucha, pronunciación, lectura, fluency según nivel). Varios ejercicios por clase — no dejes que la clase sea solo eco oral; ver secciones WRITING EXERCISE y DRILL TOOLS.
- **Transiciones:** Cada vez que cambies de fase (calentamiento → presentación → práctica controlada → modal → semi-libre), una frase explícita en el idioma de instrucción permitido para el nivel, como haría una profesora al frente.
- **Objetivos visibles:** En los primeros minutos, comunicá en lenguaje simple qué van a poder hacer hoy según los OBJETIVOS; volvé a enlazarlo al menos una vez al medio de la clase.

${levelRules}
${pedagogy}
${errorCorrection}
${notebook}
${writingExercise}
${writingFeedback}
${drillRules}
${openingPrompt}
`;
    }
  } catch (error) {
    console.error('[Token API] Error getting lesson context:', error);
    // Build fallback context with conversation history if available
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = `
📚 CONTEXTO DE CONVERSACIÓN PREVIA:
${conversationHistory.slice(-10).map((msg: any, index: number) => 
  `${index + 1}. ${msg.type === 'user' ? 'ESTUDIANTE' : 'VOS'}: "${msg.content}"`
).join('\n')}

🚨 CONTINÚA desde donde se quedó la conversación - NO reinicies.
`;
    }

    // Fallback path: lesson lookup failed. Still emit the persona and the
    // strongest English-scaffolding guardrail so we never accidentally greet
    // an unknown (and possibly brand-new) student in advanced Spanish.
    const fallbackPersona = getPersonaPrompt();
    const fallbackLevelRules = getLevelSpecificRules('A1.1');
    const fallbackOpening =
      conversationHistory.length > 0
        ? getResumeAfterReconnectPrompt('A1.1')
        : getFirstResponsePrompt('A1.1');
    lessonContext = `
${fallbackPersona}

---
LECCIÓN ACTUAL: Práctica conversacional básica (Nivel A1, Sub-nivel A1.1)
OBJETIVOS: Saludos, presentaciones, vocabulario básico
POSICIÓN DEL ESTUDIANTE: ${describeLessonPosition('A1.1', 1, 1)}

${conversationContext}

- Enfócate en saludos y presentaciones básicas
- Practica vocabulario fundamental en español

${fallbackLevelRules}
${fallbackOpening}
`;
  }
  
  try {
    console.log('[Token API] Creating OpenAI Realtime session');
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice: 'sage',
        modalities: ['audio', 'text'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        temperature: 0.65,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.85,
          prefix_padding_ms: 700,
          silence_duration_ms: 1500
        },
        input_audio_transcription: {
          model: 'gpt-4o-transcribe',
          language: 'es'
        },
        tools: REALTIME_TOOLS,
        tool_choice: 'auto',
        instructions: `[SYS]
${lessonContext}

---
### TOOLS (MANDATORIOS — REGLAS NO NEGOCIABLES)
Tenés cinco herramientas disponibles. Son la ÚNICA forma correcta de indicar estas acciones. NO narres estas acciones en el habla — las herramientas las registran por vos.

- **add_to_notebook(word, english?)** — Cuaderno visible + SRS: llamala **con frecuencia** (casi cada turno donde enseñes/corrijas/modelés español nuevo o un chunk memorizable). Incluye correcciones-foco, frames cortos y líneas clave de escucha/lectura — no solo la primera palabra del día. Sin narrar "lo escribo en el cuaderno".
- **mark_concept_taught(concept)** — Llamala UNA VEZ por cada concepto pedagógico nuevo (una regla gramatical, un tema de vocabulario, un patrón de uso). Ejemplo: "condicional simple", "verbos en -ar".
- **mark_speaking_prompt(description?)** — Llamala CADA VEZ que le pidas al estudiante hablar, repetir o responder en voz alta.
- **request_writing_exercise(...)** — Varios ejercicios escritos por clase (plan **2+** en ~30 min cuando el nivel lo permita). No sustituyas esto con "repetí conmigo" interminable. No describas el enunciado entero en voz; abrí el modal.
- **request_end_lesson(reason)** — Llamala ANTES de cualquier despedida, resumen, o frase de cierre. El sistema responderá con un function_call_output \`{ allowed: boolean, reason: string, action: string }\`:
  - Si \`allowed: false\`: continuá inmediatamente con el próximo concepto SIN reconocer que quisiste cerrar, SIN disculparte, y SIN mencionar la herramienta. Seguí la instrucción del campo \`action\`.
  - Si \`allowed: true\`: podés hacer un resumen breve (2-3 frases) y despedirte.

### REGLAS DE CIERRE
- La app del estudiante **solo marca la lección como completada** cuando llamás a \`request_end_lesson\` y recibís \`allowed: true\`. Si te despedís en voz sin ese flujo, el estudiante ve la lección **sin terminar** aunque suene como fin. Por eso: primero el tool, después la despedida (solo si \`allowed: true\`).
- NUNCA te despidas, resumas, ni uses frases como "Que tengas un buen día", "Sigue así", "Hasta luego", "Has hecho un gran trabajo hoy" sin haber llamado primero a \`request_end_lesson\` y recibido \`allowed: true\`.
- NUNCA hagas un "repaso de lo aprendido hoy" ni un párrafo de cierre en español (p. ej. "Ahora que ya conocés…", "Dijimos hola…") sin \`request_end_lesson\` con \`allowed: true\`. En **A1.1 y A1.2** cualquier repaso breve, si alguna vez hiciera falta antes del cierre autorizado, va en **INGLÉS** — nunca cambies el medio de la clase al español para eso.
- NUNCA le preguntes al estudiante si quiere terminar ("¿Hay algo más?", "¿Querés seguir?", "¿Qué te gustaría hacer ahora?"). Vos dirigís la clase.
- Si el estudiante dice "ok", "dale", "genial", "thanks": **no es cierre**. Seguí con el siguiente paso de práctica o herramienta; no interpretes afirmaciones cortas como fin de lección.
- Transcripciones muy cortas o en inglés ("so", "uh") **no cuentan** como producción del objetivo en español: pedí repetición en inglés; no celebres ni cierres sobre eso.
- Si el estudiante parece desmotivado ("no sé", "no", respuestas cortas): NO cierres. Reconocé brevemente la emoción ("Te entiendo") y cambiá a una actividad nueva y más fácil relacionada al tema. Nunca preguntes si quiere cambiar de tema — proponé vos.

### RECONEXIÓN
Si la sesión se reconecta, retomá la conversación naturalmente desde el contexto previo. No menciones la desconexión.

### TURNO DE VOZ (no contestar tus propias preguntas)
En Realtime, cada respuesta tuya es **un solo bloque de audio** hasta que cortás. Si preguntás "¿cómo dirías…?" o pedís una producción, **terminá ahí**. Prohibido en el **mismo** turno: "Por ejemplo, podrías decir: «…»", "Algo como…", "Tu oración sería…", la oración modelo completa, **y además** otra pregunta tipo "¿Te animás a…?" — eso roba el turno. Un turno = breve feedback O una pregunta, no los tres.
Si el estudiante dice "ayúdame": **no** le leas un párrafo modelo; ofrecé **una** pista mínima (elección A/B o un solo hueco) o abrí \`request_writing_exercise\`. El siguiente paso largo va **después** de su próximo audio.

${getFinalLanguageGuardrail(subLevel)}
`
      }),
    });
    
    console.log('[Token API] OpenAI response status:', r.status);
    
    if (!r.ok) {
      const errText = await r.text();
      console.error('[Token API] OpenAI error', r.status, errText);
      return new Response(
        JSON.stringify({
          error: 'OpenAI session creation failed',
          status: r.status,
          detail: errText.slice(0, 2000),
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const json = await r.json();
    console.log('[Token API] Session created successfully');
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e:any) {
    console.error('[Token API] Exception in OpenAI call:', e);
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500 });
  }
}
