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
  getFirstResponsePrompt
} from '@/lib/prompts';
import { REALTIME_TOOLS } from '@/lib/realtime-tools';


// Generate level-appropriate language instructions
function getLevelAppropriateInstructions(userLevel: string, lessonLevel: string): string {
  // Use the higher of user level or lesson level for appropriate challenge
  const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const userLevelIndex = levels.indexOf(userLevel) >= 0 ? levels.indexOf(userLevel) : 0;
  const lessonLevelIndex = levels.indexOf(lessonLevel) >= 0 ? levels.indexOf(lessonLevel) : 0;
  const effectiveLevel = levels[Math.max(userLevelIndex, lessonLevelIndex)];
  
  // This function is now a placeholder. The new modular functions from prompts.ts will be used instead.
  // It's kept for compatibility in case other parts of the system still call it directly,
  // but the main prompt assembly will use the new functions.
  return getLevelSpecificRules(effectiveLevel);
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

      const effectiveLevel = getEffectiveLevel(userLevel, lessonLevel);
      
      const persona = getPersonaPrompt();
      const pedagogy = getPedagogyPrompt();
      const errorCorrection = getErrorCorrectionPrompt();
      const notebook = getNotebookPrompt();
      const writingExercise = getWritingExercisePrompt();
      const writingFeedback = getWritingExerciseFeedbackPrompt();
      const levelRules = getLevelSpecificRules(effectiveLevel);
      const firstResponse = getFirstResponsePrompt(effectiveLevel);

      lessonContext = `
LECCIÓN ACTUAL: "${currentLesson.title}" (Nivel ${currentLesson.cefr})
OBJETIVOS: ${currentLesson.objectives?.join(', ') || 'Práctica conversacional'}
DURACIÓN ESTIMADA: ${currentLesson.estimatedDuration} minutos

${conversationContext}

${notebookContext}

${userProfileContext}

---
### INSTRUCCIONES DE ENSEÑANZA
- **Foco:** Concéntrate exclusivamente en los objetivos de esta lección. No introduzcas temas o vocabulario no relacionados.
- **Un Concepto a la Vez:** Introduce un solo concepto nuevo (palabra, frase, regla) y luego haz que el estudiante lo practique antes de continuar.
- **Guía al Estudiante:** Si el estudiante se desvía, guíalo amablemente de vuelta a los objetivos de la lección.

${levelRules}
${pedagogy}
${errorCorrection}
${notebook}
${writingExercise}
${writingFeedback}
${firstResponse}
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
  
  // This helper function was added to calculate the effective level
  // and make it available for all prompt generation functions.
  function getEffectiveLevel(userLevel: string, lessonLevel: string): string {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const userLevelIndex = levels.indexOf(userLevel) >= 0 ? levels.indexOf(userLevel) : 0;
    const lessonLevelIndex = levels.indexOf(lessonLevel) >= 0 ? levels.indexOf(lessonLevel) : 0;
    return levels[Math.max(userLevelIndex, lessonLevelIndex)];
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
        temperature: 0.7,
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

- **add_to_notebook(word)** — Llamala CADA VEZ que introduzcas una palabra o frase nueva en español, ANTES de pronunciarla. No digas "Escribo X en el cuaderno"; la herramienta se encarga.
- **mark_concept_taught(concept)** — Llamala UNA VEZ por cada concepto pedagógico nuevo (una regla gramatical, un tema de vocabulario, un patrón de uso). Ejemplo: "condicional simple", "verbos en -ar".
- **mark_speaking_prompt(description?)** — Llamala CADA VEZ que le pidas al estudiante hablar, repetir o responder en voz alta.
- **request_writing_exercise(exerciseType, prompt, expectedAnswer?, hints?)** — Llamala para iniciar un ejercicio escrito. No describas ejercicios escritos en prosa; la herramienta abre el modal.
- **request_end_lesson(reason)** — Llamala ANTES de cualquier despedida, resumen, o frase de cierre. El sistema responderá con un function_call_output \`{ allowed: boolean, reason: string, action: string }\`:
  - Si \`allowed: false\`: continuá inmediatamente con el próximo concepto SIN reconocer que quisiste cerrar, SIN disculparte, y SIN mencionar la herramienta. Seguí la instrucción del campo \`action\`.
  - Si \`allowed: true\`: podés hacer un resumen breve (2-3 frases) y despedirte.

### REGLAS DE CIERRE
- NUNCA te despidas, resumas, ni uses frases como "Que tengas un buen día", "Sigue así", "Hasta luego", "Has hecho un gran trabajo hoy" sin haber llamado primero a \`request_end_lesson\` y recibido \`allowed: true\`.
- NUNCA le preguntes al estudiante si quiere terminar ("¿Hay algo más?", "¿Querés seguir?", "¿Qué te gustaría hacer ahora?"). Vos dirigís la clase.
- Si el estudiante parece desmotivado ("no sé", "no", respuestas cortas): NO cierres. Reconocé brevemente la emoción ("Te entiendo") y cambiá a una actividad nueva y más fácil relacionada al tema. Nunca preguntes si quiere cambiar de tema — proponé vos.

### RECONEXIÓN
Si la sesión se reconecta, retomá la conversación naturalmente desde el contexto previo. No menciones la desconexión.
`
      }),
    });
    
    console.log('[Token API] OpenAI response status:', r.status);
    
    if (!r.ok) {
      const errText = await r.text();
      console.error('[Token API] OpenAI error response:', errText);
      return new Response(JSON.stringify({ error: errText }), { status: 500 });
    }
    
    const json = await r.json();
    console.log('[Token API] Session created successfully');
    return new Response(JSON.stringify(json), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (e:any) {
    console.error('[Token API] Exception in OpenAI call:', e);
    return new Response(JSON.stringify({ error: e?.message || 'unknown' }), { status: 500 });
  }
}
