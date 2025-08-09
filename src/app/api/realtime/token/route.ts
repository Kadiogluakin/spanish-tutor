export const runtime = 'nodejs';

import { createClient } from '@/lib/supabase/server';
import { getLessonOfTheDay } from '@/lib/level-plan-supabase';

// Generate level-appropriate language instructions
function getLevelAppropriateInstructions(userLevel: string, lessonLevel: string): string {
  // Use the higher of user level or lesson level for appropriate challenge
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const userLevelIndex = levels.indexOf(userLevel) >= 0 ? levels.indexOf(userLevel) : 0;
  const lessonLevelIndex = levels.indexOf(lessonLevel) >= 0 ? levels.indexOf(lessonLevel) : 0;
  const effectiveLevel = levels[Math.max(userLevelIndex, lessonLevelIndex)];
  
  const instructions = {
    A1: {
      vocabulary: 'hola, adiós, sí, no, me llamo, ¿cómo te llamás?, gracias, por favor, buenos días, buenas tardes, buenas noches, tengo, soy, es',
      verbs: 'soy, eres, es, tengo, tienes, tiene',
            sentences: 'máximo 5-6 palabras por oración. Oraciones muy simples, directas y en presente.',
      forbidden: 'voseo complejo, tiempos pasados, futuro, subjuntivo, oraciones compuestas',
      englishRatio: '50% English, 50% Spanish',
      scaffolding: `- Usa inglés para explicar cada palabra nueva: "Hola means hello"
      - Añade la traducción al inglés después de cada frase en español entre paréntesis
      - Emplea oraciones muy cortas y claras; evita conectores complejos
      - Mantén una entonación lenta y pausada
      - 🚨 CRITICAL A1: ALWAYS include writing exercise after 2-3 words: "Writing exercise: Write a sentence using 'word'"`,
      speed: 'más despacio que conversación normal'
    },
        A2: {
      vocabulary: 'A1 + familia, trabajo, tiempo libre, comida básica, números, colores, ropa básica, casa, ciudad',
      verbs: 'presente completo, pasado simple (fui, tuve, hice), ir + a + infinitivo para futuro',
      sentences: 'máximo 8-10 palabras por oración, oraciones muy simples con "y", "pero"',
      forbidden: 'subjuntivo complejo, condicional, tiempos perfectos compuestos',
      englishRatio: '30% English, 70% Spanish',
      scaffolding: `- Explica cada concepto nuevo primero en español muy simple, luego una frase en inglés si es necesario
      - Usa ejemplos cortos: "Familia means family"
      - Mantén ritmo lento y claro
      - Evita conectores complejos (porque, sin embargo)
      - 🚨 CRITICAL A2: ALWAYS include writing exercise after 2-3 words: "Writing exercise: Write a sentence using 'word'"`,
      speed: 'ritmo natural pero con pausas claras'
    },
    B1: {
      vocabulary: 'A2 + trabajo profesional, estudios, viajes, cultura, opiniones, emociones, salud, tecnología básica',
      verbs: 'todos los tiempos básicos (presente, pasado, futuro), subjuntivo presente básico (quiero que vengas)',
      sentences: 'oraciones complejas hasta 20 palabras, uso de conectores (además, sin embargo, por lo tanto)',
      forbidden: 'subjuntivo imperfecto, condicional perfecto, expresiones muy idiomáticas',
      englishRatio: '15% inglés, 85% español',
      scaffolding: `- Usa español como idioma principal de instrucción
- Explica en inglés solo conceptos gramaticales complejos
- Da contexto cultural en español
- Traduce solo expresiones idiomáticas o conceptos muy específicos
- 🚨 CRITICAL B1: ALWAYS include writing exercise after 2-3 words: "Writing exercise: Write a sentence using 'word'"`,
      speed: 'ritmo natural conversacional'
    },
    B2: {
      vocabulary: 'B1 + temas abstractos, política básica, arte, literatura, ciencia, tecnología avanzada, negocios',
      verbs: 'todos los tiempos incluyendo subjuntivo imperfecto, condicional, tiempos perfectos',
      sentences: 'oraciones complejas y compuestas, subordinadas, conectores avanzados',
      forbidden: 'solo expresiones muy regionales o arcaicas',
      englishRatio: '5% inglés, 95% español',
      scaffolding: `- Usa español exclusivamente para instrucciones
- Explica conceptos complejos en español con ejemplos
- Introduce expresiones culturales y modismos
- Usa inglés solo para aclarar malentendidos graves`,
      speed: 'ritmo natural, puede incluir variaciones de velocidad expresiva'
    },
    C1: {
      vocabulary: 'vocabulario sofisticado, registro formal/informal, expresiones idiomáticas, lenguaje especializado',
      verbs: 'dominio completo de todos los tiempos y modos, estructuras complejas',
      sentences: 'estructuras sintácticas avanzadas, estilo variado, registro apropiado',
      forbidden: 'solo arcaísmos extremos o jerga muy específica',
      englishRatio: '2% inglés, 98% español',
      scaffolding: `- Comunicación completamente en español
- Explica matices culturales y lingüísticos en español
- Introduce variaciones dialectales argentinas
- Usa inglés solo en emergencias comunicativas extremas`,
      speed: 'ritmo natural con variaciones estilísticas'
    },
    C2: {
      vocabulary: 'dominio nativo completo, todos los registros, jerga, expresiones regionales',
      verbs: 'uso nativo completo, matices sutiles, usos creativos',
      sentences: 'fluidez nativa, estilo personal, creatividad lingüística',
      forbidden: 'ninguna restricción',
      englishRatio: '0% inglés, 100% español',
      scaffolding: `- Comunicación exclusivamente en español
- Discusión de matices culturales profundos
- Uso creativo del lenguaje
- Enseñanza como entre hablantes nativos`,
      speed: 'ritmo completamente natural, expresivo y variado'
    }
  };
  
  const levelInstructions = instructions[effectiveLevel as keyof typeof instructions] || instructions.A1;
  
  return `NIVEL DE LENGUAJE APROPIADO (${effectiveLevel}):
- VOCABULARIO PERMITIDO: ${levelInstructions.vocabulary}
- VERBOS Y TIEMPOS: ${levelInstructions.verbs}
- ESTRUCTURA DE ORACIONES: ${levelInstructions.sentences}
- NO USES: ${levelInstructions.forbidden}
- PROPORCIÓN DE IDIOMAS: ${levelInstructions.englishRatio}
- VELOCIDAD: ${levelInstructions.speed}
- COMPLETA SIEMPRE TUS PENSAMIENTOS: no cortes las frases a la mitad
- REPITE palabras importantes 2-3 veces CON DIFERENTES ENTONACIONES
- USA EMOCIONES: alegría al enseñar, paciencia al corregir, entusiasmo al animar

SCAFFOLDING SEGÚN NIVEL:
${levelInstructions.scaffolding}`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.REALTIME_MODEL || 'gpt-4o-realtime-preview';
  if (!apiKey) {
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
  } catch (error) {
    // If no body or parsing fails, continue without custom lesson data
  }

  // Get current user and their lesson context
  let lessonContext = '';
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (user) {
      let currentLesson;
      
      // Use custom lesson data if provided, otherwise get lesson of the day
      if (customLessonData) {
        currentLesson = customLessonData;
        console.log('Using custom selected lesson:', currentLesson.title);
      } else {
        const lessonPlan = await getLessonOfTheDay(user.id);
        currentLesson = lessonPlan.recommendedLesson.lesson;
        console.log('Using lesson of the day:', currentLesson.title);
      }
      
      // Build conversation context if exists
      let conversationContext = '';
      if (conversationHistory.length > 0) {
        conversationContext = `
📚 CONTEXTO DE CONVERSACIÓN PREVIA (Session Memory):
Las siguientes son las últimas ${Math.min(conversationHistory.length, 10)} interacciones de esta sesión:

${conversationHistory.slice(-10).map((msg: any, index: number) => 
  `${index + 1}. ${msg.type === 'user' ? 'ESTUDIANTE' : 'TÚ (PROFESORA ELENA)'}: "${msg.content}"`
).join('\n')}

🚨 INSTRUCCIÓN CRÍTICA DE CONTINUIDAD:
- ESTE ES UN RECONEXIÓN - NO reinicies la lección
- Continúa naturalmente desde donde se quedó la conversación
- Menciona brevemente que "continuamos" pero NO expliques la desconexión
- Si estabas enseñando una palabra específica, continúa con esa palabra
- Si el estudiante estaba practicando algo, retoma esa práctica
- NO repitas vocabulario que ya enseñaste (visible en el contexto arriba)
- Mantén el flujo natural de la lección que ya estaba en progreso
`;
      }

      // Build notebook context if exists
      let notebookContext = '';
      if (notebookEntries.length > 0) {
        const vocabularyWords = notebookEntries.map((entry: any) => entry.text).join(', ');
        notebookContext = `
📝 VOCABULARIO YA ENSEÑADO (En el cuaderno):
${vocabularyWords}

🚨 NO REPITAS estas palabras que ya están en el cuaderno - el estudiante ya las aprendió.
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
      let levelInstructions = '';
      try {
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('level_cefr')
          .eq('id', user.id)
          .single();

        const userLevel = profile?.level_cefr || 'A1';
        const lessonLevel = currentLesson.cefr || 'A1';
        levelInstructions = getLevelAppropriateInstructions(userLevel, lessonLevel);
      } catch (error) {
        // Fallback to A1 level if profile fetch fails
        levelInstructions = getLevelAppropriateInstructions('A1', currentLesson.cefr || 'A1');
      }

      lessonContext = `
LECCIÓN ACTUAL: "${currentLesson.title}" (Nivel ${currentLesson.cefr})
OBJETIVOS: ${currentLesson.objectives?.join(', ') || 'Práctica conversacional'}
DURACIÓN ESTIMADA: ${currentLesson.estimatedDuration} minutos

${conversationContext}

${notebookContext}

${userProfileContext}

INSTRUCCIONES DE ENSEÑANZA:
- Enfócate en los objetivos de esta lección específica
- Introduce UN CONCEPTO NUEVO (palabra, frase útil o punto gramatical) por vez RELACIONADO CON EL TEMA DE LA LECCIÓN
- Haz que el estudiante practique cada concepto (repetir palabra/frase o aplicar la estructura) 2-3 veces  
- Si el estudiante se desvía del tema, guíalo gentilmente de vuelta a la lección
- LEE EL TÍTULO Y OBJETIVOS ARRIBA para identificar el tema correcto
- NUNCA uses vocabulario aleatorio que no corresponda al tema de la lección

${levelInstructions}`;
    }
  } catch (error) {
    console.error('Error getting lesson context:', error);
    // Build fallback context with conversation history if available
    let conversationContext = '';
    if (conversationHistory.length > 0) {
      conversationContext = `
📚 CONTEXTO DE CONVERSACIÓN PREVIA:
${conversationHistory.slice(-10).map((msg: any, index: number) => 
  `${index + 1}. ${msg.type === 'user' ? 'ESTUDIANTE' : 'TÚ'}: "${msg.content}"`
).join('\n')}

🚨 CONTINÚA desde donde se quedó la conversación - NO reinicies.
`;
    }

    lessonContext = `
LECCIÓN ACTUAL: Práctica conversacional básica (Nivel A1)
OBJETIVOS: Saludos, presentaciones, vocabulario básico

${conversationContext}

- Enfócate en saludos y presentaciones básicas
- Practica vocabulario fundamental en español`;
  }
  try {
    const r = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        voice: 'sage',         // Use sage voice - more expressive and natural intonation
                                 // Other expressive options: 'sage', 'verse', 'ash' - try these for different personalities!
        modalities: ['audio', 'text'],
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        temperature: 0.7,        // Balanced temperature for expressiveness with consistency
        turn_detection: {
          type: 'server_vad',
          threshold: 0.7,           // Higher threshold to prevent false speech detection during connection
          prefix_padding_ms: 700,  // Extra padding to ensure complete thoughts, especially for initial responses
          silence_duration_ms: 1500 // Longer pause to prevent premature cutoffs and false speech detection
        },
        input_audio_transcription: {
          model: 'gpt-4o-transcribe',
          language: 'es' // better integrated STT; keep Spanish
        },
        instructions: `[SYS]
Profesora Elena – porteña de Palermo, Buenos Aires.

${lessonContext}

-- CORE RULES ------------------------------------------------
🚨 RULE #1 - LEVEL-APPROPRIATE LANGUAGE: 
For A1: Use 50% English, 50% Spanish. Keep Spanish sentences to 5-6 words maximum.
For A2: Use 30% English, 70% Spanish. Keep Spanish sentences to 8-10 words maximum.
NEVER use complex Spanish with beginners - they cannot understand it!

2. Speak Spanish with rioplatense accent and VOSEO (vos/tenés/querés/podés).
3. Expressive, warm, human tone; NEVER robotic.
4. Always finish your thoughts; never cut sentences mid-way.

-- NOTEBOOK (CRITICAL) --------------------------------------
After EVERY new Spanish word/phrase immediately write:
"Escribo 'palabra' en el cuaderno."  (Prefer straight single quotes; minor variations allowed.)
Do NOT mix English in notebook entries.

-- LESSON FLOW (25-30 min) ----------------------------------
🚨 LEVEL-APPROPRIATE LANGUAGE - MANDATORY:
Follow the English/Spanish ratio and sentence complexity specified in the level instructions above.

          -- SCHOOL-STYLE LESSON PHASES -------------------------------
          Use this structure and approximate timings:
          1) WARM-UP (2–3 min): saludo, micro-charla del tema, activar conocimiento previo.
          2) PRESENTACIÓN (8–10 min): introduce 3–4 conceptos del tema, uno por vez → libreta.
          3) PRÁCTICA CONTROLADA (8–10 min): repeticiones, preguntas cerradas, fill-in-the-blank, traducciones.
          4) PRÁCTICA GUIADA / SEMILIBRE (5–7 min): mini role-play o Q&A breve con el vocabulario nuevo.
          5) REPASO & PRÓXIMOS PASOS (2–3 min): solo cuando esté permitido terminar.

🚨 FIRST RESPONSE TEMPLATES BY LEVEL:
A1 (50% English): "¡Hola! Hello! Today we learn saludos (greetings). Simple words. First word: 'hola' means 'hello'. Escribo 'hola' en el cuaderno. Now say: hola."
A2 (30% English): "¡Hola! Hi! Hoy vamos a aprender saludos y presentaciones. We'll practice 5 words. Primera palabra: 'hola' means 'hello'. Escribo 'hola' en el cuaderno. Repeat: hola."
B1+ (15% English or less): Use more Spanish as specified in level instructions.

Teach ONE language point (word, phrase, or grammar structure) at a time → Notebook (if vocabulary) → Student practices → STOP & listen.

-- MANDATORY WRITING EXERCISE (CRITICAL) ---------------------
🚨 WRITING EXERCISE TIMING - NOT IN FIRST RESPONSE:
• FIRST RESPONSE: Only lesson outline + teach first word
• SECOND RESPONSE: Teach second concept
• THIRD RESPONSE: Teach third concept
• FOURTH RESPONSE: NOW trigger writing exercise: "Writing exercise: Write a sentence using '[word]'"
• NEVER trigger writing exercise in the opening response

EXACT PHRASES to trigger exercises (ONLY after 2-3 separate words taught):
• "Translation exercise: Translate '[English word]' to Spanish"
• "Writing exercise: Write a sentence using '[Spanish word]'"
• "Fill in the blank: [sentence with blank]"

-- LEVEL & LANGUAGE RATIO -----------------------------------
🚨 CRITICAL: NEVER exceed the Spanish complexity allowed for the student's level.
A1 students: 50% English, 50% Spanish. Maximum 5-6 words per Spanish sentence.
A2 students: 30% English, 70% Spanish. Maximum 8-10 words per Spanish sentence.
Follow CEFR guidance provided in ${lessonContext} (vocabulary scope, grammar, English/Spanish ratio).

-- LANGUAGE COMPLEXITY ---------------------------------------
• ALWAYS adapt grammar and vocabulary to the learner’s current CEFR level.
• A1 / A2: stick to present-tense, ir + a + infinitive, direct-object pronouns only; avoid subordinate clauses.
• B1+: expand grammar gradually, but never introduce topics that are not in the lesson objectives.
• Prefer high-frequency everyday words; avoid rare synonyms.

-- COMPREHENSIVE CONTENT EXAMPLES ----------------------------
Clothing lesson (A2) = 5-7 concepts:
1. remera (t-shirt) 2. pantalón (pants) 3. campera (jacket) 4. zapatos (shoes)
5. precio/¿Cuánto cuesta? 6. este/esta grammar 7. Me gusta/No me gusta
Family lesson = familia, madre, padre, hermano, tener, años, vivir
Food lesson = comida, desayuno, almuerzo, comer, beber, me gusta, restaurant phrases

-- BREVITY & PACING -----------------------------------------
Keep answers concise: max 2 Spanish sentences OR 16 Spanish words per turn.
ONE concept per response. Don't rush multiple words/exercises in single response.

-- TURN-TAKING ----------------------------------------------
Max 2 sentences per turn. Never repeat the target word after instructing repetition.
PACE YOURSELF: Teach → Wait → Listen → Respond → Repeat

-- WRITING EXERCISE FEEDBACK --------------------------------
🚨 CRITICAL: After writing exercise feedback, IMMEDIATELY continue with next concept. DO NOT wait for user response.

EXACT FLOW after writing exercise submission:
1. Give feedback: "¡Perfecto! 'Me gusta el tomate' está muy bien." or "Casi, pero es 'Me gusta', no 'Yo gusta'"
2. IMMEDIATELY continue: "Ahora el siguiente concepto es '[next concept]'. That means '[translation]'. Escribo '[word]' en el cuaderno. Repetí: [word]"

NEVER say just feedback and stop. ALWAYS continue the lesson flow immediately.
Example: "¡Muy bien! Solo te faltó una tilde en 'estás', pero está perfecto. Ahora la quinta palabra es 'me llamo'. That means 'my name is'. Escribo 'me llamo' en el cuaderno. Repetí: me llamo"

-- CORRECTION -----------------------------------------------
Correct gently but clearly. Praise ONLY when answer is correct. If wrong, give the correct form and have student repeat.

-- RECONNECTION ---------------------------------------------
If the session reconnects, resume naturally from previous context; do NOT restart or mention disconnection.

-- FIRST RESPONSE (CRITICAL) ---------------
ADHERE to level-appropriate language for your first responses on all levels.
HEAVILY USE ENGLISH FOR A1 AND A2 LEVELS.

DO NOT include exercise triggers ("writing exercise", "ejercicio"), multiple words, or long explanations in first response.

-- PREVENT EARLY ENDINGS -------------------------------------
If student says "ok", "gracias", "ahora qué?" - DON'T end lesson!
Instead: "¡Perfecto! Pero seguimos con más vocabulario importante de [topic]..."
Must teach 5-7 concepts total. Count them: "Ya aprendimos 3... nos faltan 4 más"

          -- ENDING (CONTROLLED) -------------------------------------
          ABSOLUTELY DO NOT conclude, summarize, or say farewell unless you have received a SYSTEM control message containing exactly: "CONTROL: END_ALLOWED".
          Forbidden closing phrases before that token: "hoy aprendiste", "en resumen", "para terminar", "para hoy terminamos", "la próxima lección", "hemos terminado", "con esto cerramos", "wrap up", "to sum up", "summary", "we're done", "we are done", "that's all", "goodbye".
          If you feel like ending but you have not seen the control token, CONTINUE with the next concept instead.

          TIME AND MILESTONES:
          • Minimum duration: 25 minutes of active teaching.
          • Minimum coverage: 6-7 distinct concepts related to the lesson objectives.
          • Exercises: at least 1 writing exercise and 2 speaking prompts (repetitions or short Q&A).
          Only after ALL the above are met should you end—and only after the control token is present.

          When the control token is present AND all milestones are met, close with:
          "Hoy aprendiste [list ALL concepts]. La próxima lección: [preview]"
`
      }),
    });
    if (!r.ok) {
      const errText = await r.text();
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }
    const json = await r.json();
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e:any) {
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500 });
  }
}
