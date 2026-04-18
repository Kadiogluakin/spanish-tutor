import { createClient } from '@/lib/supabase/server';

// Homework prompts based on lesson level and type. All imperatives use VOSEO
// (rioplatense Spanish) — hablá, escribí, contá, decí — to match the app's
// Argentine Spanish focus. If you add prompts here, run them mentally through
// `toVoseo()` from `@/lib/locale/spanish` or write them in voseo directly.
const HOMEWORK_TEMPLATES = {
  A1: {
    writing: [
      "Escribí 5 oraciones simples sobre vos. Ejemplos: 'Me llamo María.', 'Tengo 25 años.', 'Soy de México.', 'Me gusta la pizza.', 'Estudio español.' (30-50 palabras total)",
      "Completá estas oraciones con tus datos: 'Hola, me llamo _____', 'Tengo _____ años', 'Vivo en _____', 'Me gusta _____', 'No me gusta _____'. Después escribí 2 oraciones más sobre vos. (30-50 palabras total)",
      "Escribí los días de la semana y elegí tu día favorito. Escribí 3 oraciones sobre qué hacés ese día. Ejemplo: 'Mi día favorito es sábado. Duermo mucho. Como con mi familia.' (30-50 palabras total)",
    ],
    speaking: [
      "Grabá 1 minuto presentándote de forma muy básica: decí tu nombre, edad, de dónde sos, y una cosa que te gusta. Hablá MUY despacio. Ejemplo: 'Hola. Me llamo Ana. Tengo veinte años. Soy de Colombia. Me gusta el café.'",
      "Grabá 1 minuto contando números del 1 al 20, después decí los colores que conocés, y terminá diciendo 3 cosas que hay en tu cuarto. Ejemplo: 'Uno, dos, tres... rojo, azul, verde... En mi cuarto hay una cama, una mesa, una ventana.'",
      "Grabá 1 minuto hablando sobre comida. Decí 3 comidas que te gustan y 2 que no te gustan. Usá 'Me gusta...' y 'No me gusta...'. Ejemplo: 'Me gusta la pizza. Me gusta el chocolate. Me gusta el arroz. No me gusta el brócoli. No me gusta el pescado.'",
    ]
  },
  A2: {
    writing: [
      "Escribí sobre tu día de ayer usando pretérito indefinido. Contá 6-8 oraciones sobre qué hiciste. Ejemplos: 'Ayer me levanté a las 7. Desayuné cereal. Fui al trabajo en colectivo.' (60-80 palabras total)",
      "Describí tu familia escribiendo 2 oraciones sobre cada persona. Usá 'es / está / tiene / le gusta'. Ejemplo: 'Mi mamá es doctora. Tiene 45 años. Mi papá está en casa. Le gusta cocinar.' (60-80 palabras total)",
      "Escribí sobre tu ciudad comparándola con otra ciudad que conocés. Usá 'más grande', 'menos calor', 'mejor', 'peor'. Ejemplo: 'Mi ciudad es más pequeña que Buenos Aires. Hace menos calor acá. La comida es mejor en mi ciudad.' (60-80 palabras total)",
    ],
    speaking: [
      "Grabá 2 minutos contando qué hiciste el fin de semana pasado. Usá pretérito indefinido: 'fui', 'comí', 'vi', 'hablé'. Hablá despacio y usá ejemplos concretos.",
      "Grabá 2 minutos describiendo tu rutina diaria normal. Decí a qué hora hacés cada cosa: 'Me levanto a las...', 'Desayuno a las...', 'Voy al trabajo a las...'. Incluí al menos 6 actividades.",
      "Grabá 2 minutos hablando sobre tu casa o departamento. Describí cada ambiente y decí qué hay ahí: 'En la cocina hay...', 'En el dormitorio tengo...', 'El baño está...'",
    ]
  },
  B1: {
    writing: [
      "Escribí un ensayo de 200-250 palabras sobre las ventajas y desventajas de la tecnología moderna. Estructurá tu texto con introducción, desarrollo y conclusión.",
      "Redactá una carta formal de 200-250 palabras solicitando información sobre un curso de español. Usá el registro formal apropiado.",
      "Escribí tu opinión sobre el cambio climático en 200-250 palabras. Usá subjuntivo para expresar emociones y opiniones.",
    ],
    speaking: [
      "Grabá un audio de 4-5 minutos expresando tu opinión sobre un tema social actual. Usá subjuntivo y estructuras complejas.",
      "Grabá un audio de 4-5 minutos contando una historia inventada en pasado. Usá diferentes tiempos verbales y conectores narrativos.",
      "Grabá un audio de 4-5 minutos haciendo una presentación sobre tu profesión ideal. Usá futuro y condicional.",
    ]
  },
  B2: {
    writing: [
      "Redactá un ensayo argumentativo de 300-400 palabras sobre el impacto de la globalización en las culturas locales. Utilizá conectores avanzados, subjuntivo y ejemplos concretos para apoyar tu argumentación.",
      "Escribí un artículo de opinión de 300-400 palabras sobre el papel de los medios de comunicación en la sociedad actual. Analizá ventajas, desventajas y proponé soluciones. Usá registro formal y estructuras complejas.",
      "Redactá una carta formal dirigida a las autoridades locales (300-400 palabras) proponiendo soluciones para un problema ambiental en tu comunidad. Usá subjuntivo, condicional y lenguaje persuasivo.",
      "Escribí un análisis comparativo de 300-400 palabras entre las tradiciones de tu país y las de un país hispanohablante. Utilizá estructuras de comparación, subjuntivo y vocabulario cultural avanzado."
    ],
    speaking: [
      "Grabá un audio de 5-6 minutos presentando un proyecto de emprendimiento innovador. Incluí descripción del problema, solución propuesta, mercado objetivo y plan financiero. Usá futuro, condicional y vocabulario empresarial.",
      "Grabá un audio de 5-6 minutos debatiendo sobre las ventajas y desventajas de la inteligencia artificial. Presentá argumentos sólidos, usá subjuntivo para expresar opiniones y dudas, y conectores argumentativos.",
      "Grabá un audio de 5-6 minutos narrando una experiencia profesional significativa y las lecciones aprendidas. Usá tiempos narrativos complejos, discurso indirecto y reflexioná sobre el crecimiento personal.",
      "Grabá un audio de 5-6 minutos explicando un problema social actual y proponiendo soluciones viables. Usá estructuras de hipótesis, subjuntivo en cláusulas adverbiales y vocabulario sociológico avanzado."
    ]
  },

  C1: {
    writing: [
      "Redactá un ensayo académico de 500-600 palabras analizando las implicaciones socioculturales de un fenómeno contemporáneo. Utilizá al menos cinco fuentes teóricas, estructuras argumentativas complejas, registro académico formal y un aparato crítico sofisticado.",
      "Escribí un artículo de análisis literario de 500-600 palabras sobre un texto de la literatura hispanoamericana, examinando recursos estilísticos, intertextualidad y contexto sociocultural. Empleá terminología especializada, subjuntivo en contextos complejos y estructuras concesivas avanzadas.",
      "Redactá una propuesta de investigación de 500-600 palabras para un proyecto interdisciplinario. Incluí justificación teórica, metodología, hipótesis y cronograma. Usá registro académico, estructuras de modalidad epistémica y vocabulario especializado.",
      "Escribí un ensayo crítico de 500-600 palabras sobre las transformaciones del español rioplatense en el contexto de la globalización. Analizá variación sociolingüística, influencias extranjeras y resistencias identitarias usando marcos teóricos especializados."
    ],
    speaking: [
      "Grabá un audio de 7-8 minutos presentando una conferencia académica sobre tu área de especialización. Incluí marco teórico, análisis crítico y proyecciones futuras. Usá registro formal, estructuras complejas y terminología especializada con fluidez natural.",
      "Grabá un audio de 7-8 minutos conduciendo un debate intelectual sobre un dilema ético contemporáneo. Presentá múltiples perspectivas, utilizá argumentación sofisticada, estructuras concesivas complejas y demostrá competencia pragmática avanzada.",
      "Grabá un audio de 7-8 minutos analizando críticamente un fenómeno cultural argentino desde múltiples disciplinas. Integrá perspectivas históricas, sociológicas y antropológicas con fluidez y precisión terminológica.",
      "Grabá un audio de 7-8 minutos moderando una mesa redonda imaginaria entre expertos sobre cambio climático. Demostrá capacidad de síntesis, reformulación sofisticada y manejo de registros múltiples según los interlocutores."
    ]
  },

  C2: {
    writing: [
      "Componé un ensayo crítico de 700-800 palabras sobre la evolución del concepto de identidad nacional en la literatura argentina del siglo XXI. Integrá teoría literaria contemporánea, análisis intertextual profundo y reflexión metacrítica. Demostrá precisión estilística y sofisticación argumentativa de nivel experto.",
      "Redactá un artículo de opinión de 700-800 palabras para una publicación académica internacional sobre las tensiones entre tradición y modernidad en las prácticas culturales rioplatenses. Utilizá un estilo erudito pero accesible, con matices retóricos sutiles y competencia intercultural avanzada.",
      "Escribí una reseña crítica de 700-800 palabras evaluando una obra teórica reciente en tu campo de experticia. Demostrá capacidad de síntesis conceptual, análisis epistemológico y posicionamiento crítico original con elegancia estilística y precisión terminológica.",
      "Redactá un texto híbrido de 700-800 palabras que combine análisis académico y reflexión personal sobre el impacto de la tecnología en la cognición humana. Experimentá con registros múltiples, intertextualidad sofisticada y estructuras argumentativas innovadoras."
    ],
    speaking: [
      "Grabá un audio de 10-12 minutos improvisando una conferencia magistral sobre las implicaciones filosóficas de la inteligencia artificial. Demostrá elocuencia natural, capacidad de conceptualización en tiempo real, manejo experto de pausas y énfasis, y adaptación espontánea a complejidades conceptuales emergentes.",
      "Grabá un audio de 10-12 minutos ofreciendo una masterclass sobre comunicación intercultural para profesionales de élite. Exhibí maestría pedagógica, capacidad de ejemplificación sofisticada, modulación de registro según audiencia y competencia metapragmática avanzada.",
      "Grabá un audio de 10-12 minutos interpretando y comentando un texto literario complejo en tiempo real (lectura incluida). Demostrá capacidad hermenéutica instantánea, sensibilidad estética refinada, competencia intertextual y fluidez analítica de nivel crítico profesional.",
      "Grabá un audio de 10-12 minutos improvisando un análisis comparativo entre dos sistemas filosóficos o corrientes artísticas. Mostrá capacidad de síntesis conceptual espontánea, argumentación dialéctica sofisticada y elegancia expresiva con precisión terminológica experta."
    ]
  }
};

const RUBRICS = {
  writing: {
    criteria: [
      { name: 'Grammar & Accuracy', weight: 0.35, description: 'Correct use of verb tenses, sentence structure, and grammar rules' },
      { name: 'Vocabulary Range', weight: 0.25, description: 'Variety and appropriateness of vocabulary used' },
      { name: 'Task Fulfillment', weight: 0.25, description: 'Completion of all task requirements and word count' },
      { name: 'Coherence & Cohesion', weight: 0.15, description: 'Logical organization and use of connectors' },
    ],
    scale: '0-5 (0=No evidence, 1=Very poor, 2=Poor, 3=Fair, 4=Good, 5=Excellent)',
    instructions: 'Provide specific corrections for errors and constructive feedback for improvement.'
  },
  speaking: {
    criteria: [
      { name: 'Pronunciation & Fluency', weight: 0.30, description: 'Clear pronunciation, natural rhythm, and fluency' },
      { name: 'Grammar & Accuracy', weight: 0.25, description: 'Correct use of verb tenses and sentence structure' },
      { name: 'Vocabulary Range', weight: 0.25, description: 'Variety and appropriateness of vocabulary used' },
      { name: 'Task Fulfillment', weight: 0.20, description: 'Completion of task requirements and time limit' },
    ],
    scale: '0-5 (0=No evidence, 1=Very poor, 2=Poor, 3=Fair, 4=Good, 5=Excellent)',
    instructions: 'Focus on pronunciation patterns, intonation, and natural speech flow.'
  }
};

export interface HomeworkAssignment {
  id: string;
  type: string;
  prompt: string;
  dueAt: string;
  rubric: any;
}

export async function assignHomework(
  userId: string, 
  lessonId: string, 
  userLevel: string
): Promise<HomeworkAssignment | null> {
  try {
    const supabase = await createClient();
    
    // Get lesson information to create topic-specific homework
    const { data: lessonData, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, cefr, objectives, content_refs')
      .eq('id', lessonId)
      .single();
    
    if (lessonError || !lessonData) {
      console.error('Error fetching lesson data:', lessonError);
      // Fallback to generic homework if lesson not found
      return assignGenericHomework(userId, lessonId, userLevel, supabase);
    }

    // Parse lesson content
    let contentRefs;
    try {
      contentRefs = typeof lessonData.content_refs === 'string' 
        ? JSON.parse(lessonData.content_refs) 
        : lessonData.content_refs || {};
    } catch {
      contentRefs = {};
    }

    const level = userLevel.toUpperCase();
    
    // 🎯 LESSON-SPECIFIC ASSIGNMENT: Create homework based on actual lesson content
    const lessonInfo = {
      id: lessonData.id,
      title: lessonData.title,
      cefr: lessonData.cefr,
      unit: contentRefs.unit || 1,
      lesson: contentRefs.lesson || 1,
      objectives: lessonData.objectives || []
    };

    console.log('🎯 Creating lesson-specific homework for:', lessonInfo.title);

    // 🎯 ADAPTIVE ASSIGNMENT: Analyze user's error patterns and weaknesses
    const adaptiveData = await analyzeUserWeaknesses(userId, supabase);
    
    // Select homework type and create topic-specific prompt
    const homeworkType = selectHomeworkType(adaptiveData);
    const selectedPrompt = createLessonSpecificPrompt(lessonInfo, homeworkType, level);
    
    console.log('📝 Generated lesson-specific prompt:', selectedPrompt);
    
    // Set due date (3 days from now)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);

    // Create homework assignment
    const { data: homework, error: homeworkError } = await supabase
      .from('homework')
      .insert({
        user_id: userId,
        lesson_id: lessonId,
        type: homeworkType,
        prompt: selectedPrompt,
        due_at: dueDate.toISOString(),
        rubric_json: RUBRICS[homeworkType]
      })
      .select()
      .single();

    if (homeworkError) {
      console.error('Error creating homework:', homeworkError);
      return null;
    }

    return {
      id: homework.id,
      type: homework.type,
      prompt: homework.prompt,
      dueAt: homework.due_at,
      rubric: homework.rubric_json
    };

  } catch (error) {
    console.error('Error in assignHomework:', error);
    return null;
  }
}

/**
 * Analyze user's error patterns and weaknesses for adaptive homework assignment
 */
async function analyzeUserWeaknesses(userId: string, supabase: any): Promise<{
  topErrors: Array<{type: string, count: number}>;
  weakSkills: Array<{skill: string, performance: number}>;
  recentHomeworkPerformance: number;
  preferredType?: 'writing' | 'speaking';
}> {
  try {
    // Get top error patterns from recent lessons and homework.
    // NB: column is `type`, not `error_type` — previous code silently returned
    // empty rows, which defeated all adaptive homework selection.
    const { data: errors } = await supabase
      .from('error_logs')
      .select('type, count')
      .eq('user_id', userId)
      .neq('status', 'dismissed')
      .order('count', { ascending: false })
      .limit(5);

    // Get weakest skills from progress tracking. Exclude legacy
    // `error_<uuid>` pseudo-skills (cleaned up by the review migration but
    // filter defensively so stale deployments don't break adaptation).
    const { data: skills } = await supabase
      .from('skill_progress')
      .select('skill_code, sm2_easiness, failures, successes')
      .eq('user_id', userId)
      .not('skill_code', 'like', 'error_%')
      .order('sm2_easiness', { ascending: true })
      .limit(5);

    // Get recent homework performance to gauge difficulty
    const { data: recentHomework } = await supabase
      .from('submissions')
      .select('score, homework(type)')
      .eq('user_id', userId)
      .not('score', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(5);

    // Calculate average recent performance
    const avgPerformance = recentHomework?.length 
      ? recentHomework.reduce((sum: number, hw: any) => sum + (hw.score || 0), 0) / recentHomework.length
      : 75; // Default to 75% if no history

    // Determine preferred type based on recent performance
    const writingScores = recentHomework?.filter((hw: any) => hw.homework?.type === 'writing').map((hw: any) => hw.score || 0) || [];
    const speakingScores = recentHomework?.filter((hw: any) => hw.homework?.type === 'speaking').map((hw: any) => hw.score || 0) || [];
    
    const avgWriting = writingScores.length ? writingScores.reduce((a: number, b: number) => a + b, 0) / writingScores.length : 0;
    const avgSpeaking = speakingScores.length ? speakingScores.reduce((a: number, b: number) => a + b, 0) / speakingScores.length : 0;
    
    const preferredType = avgWriting < avgSpeaking - 10 ? 'writing' : 
                         avgSpeaking < avgWriting - 10 ? 'speaking' : undefined;

    return {
      topErrors: errors?.map((e: any) => ({ type: e.type, count: e.count })) || [],
      weakSkills: skills?.map((s: any) => ({ 
        skill: s.skill_code, 
        performance: Math.round((s.successes / Math.max(1, s.successes + s.failures)) * 10)
      })) || [],
      recentHomeworkPerformance: avgPerformance,
      preferredType
    };
  } catch (error) {
    console.error('Error analyzing user weaknesses:', error);
    return {
      topErrors: [],
      weakSkills: [],
      recentHomeworkPerformance: 75,
      preferredType: undefined
    };
  }
}

/**
 * Select homework type based on user's needs
 */
function selectHomeworkType(adaptiveData: any): 'writing' | 'speaking' {
  // If user struggles more with one type, assign that type for practice
  if (adaptiveData.preferredType) {
    // Assign the type they're weaker at
    return adaptiveData.preferredType === 'writing' ? 'speaking' : 'writing';
  }
  
  // Check if errors suggest need for specific type
  const writingErrors = ['grammar_general', 'verb_conjugation', 'gender_agreement', 'spelling', 'accent_marks'];
  const speakingErrors = ['pronunciation', 'oral_fluency'];
  
  const needsWriting = adaptiveData.topErrors.some((error: any) => writingErrors.includes(error.type));
  const needsSpeaking = adaptiveData.topErrors.some((error: any) => speakingErrors.includes(error.type));
  
  if (needsWriting && !needsSpeaking) return 'writing';
  if (needsSpeaking && !needsWriting) return 'speaking';
  
  // Default distribution: 70% writing, 30% speaking
  return Math.random() < 0.7 ? 'writing' : 'speaking';
}

/**
 * Select targeted prompt based on user's weak areas
 */
function selectTargetedPrompt(prompts: string[], adaptiveData: any): string {
  // If performance is low, prefer prompts with more guidance/structure
  if (adaptiveData.recentHomeworkPerformance < 60) {
    // Look for prompts with examples or more detailed instructions
    const guidedPrompts = prompts.filter(prompt => 
      prompt.includes('Ejemplo:') || prompt.includes('Ejemplos:') || prompt.includes('Example:')
    );
    if (guidedPrompts.length > 0) {
      return guidedPrompts[Math.floor(Math.random() * guidedPrompts.length)];
    }
  }
  
  // Check for specific error patterns and select relevant prompts
  const topErrorType = adaptiveData.topErrors[0]?.type;
  if (topErrorType) {
    let targetedPrompts = prompts;
    
    // Filter prompts based on error type
    if (topErrorType === 'verb_conjugation') {
      targetedPrompts = prompts.filter(prompt => 
        prompt.includes('verbos') || prompt.includes('tiempo') || prompt.includes('pasado') || 
        prompt.includes('presente') || prompt.includes('verb') || prompt.includes('tense')
      );
    } else if (topErrorType === 'ser_vs_estar') {
      targetedPrompts = prompts.filter(prompt => 
        prompt.includes('ser') || prompt.includes('estar') || prompt.includes('estado') || 
        prompt.includes('características') || prompt.includes('describing')
      );
    } else if (topErrorType === 'vocabulary_choice') {
      targetedPrompts = prompts.filter(prompt => 
        prompt.includes('vocabulario') || prompt.includes('palabras') || prompt.includes('vocabulary') ||
        prompt.includes('específic') || prompt.includes('precis')
      );
    }
    
    if (targetedPrompts.length > 0) {
      return targetedPrompts[Math.floor(Math.random() * targetedPrompts.length)];
    }
  }
  
  // Default: random selection
  return prompts[Math.floor(Math.random() * prompts.length)];
}

/**
 * Create lesson-specific homework prompt based on lesson content
 */
function createLessonSpecificPrompt(lessonInfo: any, homeworkType: 'writing' | 'speaking', level: string): string {
  const { title, unit, lesson: lessonNum, objectives } = lessonInfo;
  
  // Lesson-specific prompt mapping. All prompts are in Argentine Spanish
  // (voseo) to match the app's language focus.
  const lessonPrompts: Record<string, { writing: string, speaking: string }> = {
    // A1 Unit 1 - Primeros Pasos
    'Saludos y Presentaciones': {
      writing: "Escribí 5-6 oraciones presentándote. Incluí: tu nombre, edad, de dónde sos, tu trabajo o estudios, y algo que te gusta. Usá las expresiones de cortesía que aprendiste. Ejemplo: 'Hola, me llamo Ana. Tengo 25 años...' (40-60 palabras)",
      speaking: "Grabá 1-2 minutos presentándote como si conocieras a alguien nuevo. Incluí saludos, tu nombre, edad, origen, y despedite cortésmente. Usá las expresiones que aprendiste en la lección."
    },
    'Los Números y la Edad': {
      writing: "Escribí sobre tu familia usando números y edades. Mencioná 4-5 personas: sus nombres, edades y una característica. Ejemplo: 'Mi hermana se llama Rosa. Tiene treinta años. Es muy simpática.' (50-70 palabras)",
      speaking: "Grabá 1-2 minutos contando los números del 1-20, después hablá sobre las edades de tu familia. Decí al menos 4 edades diferentes usando 'tiene...años'."
    },
    'Países y Nacionalidades': {
      writing: "Escribí sobre 4-5 personas de diferentes países. Decí de dónde son, su nacionalidad y una característica. Usá 'es de', 'es + nacionalidad'. Ejemplo: 'Pedro es de México. Es mexicano y muy amable.' (50-70 palabras)",
      speaking: "Grabá 1-2 minutos hablando sobre países y nacionalidades. Mencioná de dónde sos vos, de dónde son tus amigos o familia, y una pregunta imaginaria '¿De dónde sos?' con respuestas."
    },

    // A1 Unit 2 - La Vida Diaria Básica
    'La Familia': {
      writing: "Describí tu familia usando vocabulario de la lección. Escribí sobre 5-6 miembros: quiénes son, sus nombres, y usá posesivos (mi, tu, su). Ejemplo: 'Mi padre se llama José. Mi hermana es muy simpática.' (50-70 palabras)",
      speaking: "Grabá 1-2 minutos describiendo tu familia. Mencioná quiénes son, sus nombres, y hablá sobre las relaciones familiares. Usá el vocabulario de familia de la lección."
    },
    'Los Colores y las Cosas': {
      writing: "Describí 6-8 objetos de tu casa o cuarto con sus colores. Usá artículos (el/la/un/una) correctamente. Ejemplo: 'En mi cuarto hay una mesa blanca. El libro es azul.' (50-70 palabras)",
      speaking: "Grabá 1-2 minutos describiendo objetos y colores que ves a tu alrededor. Mencioná al menos 8 objetos con sus colores, usando el vocabulario de la lección."
    },
    'La Casa': {
      writing: "Describí tu casa o departamento. Mencioná los ambientes que hay, dónde están las cosas, y usá 'hay' para decir qué hay en cada ambiente. Ejemplo: 'En mi casa hay tres dormitorios. En la cocina hay una mesa.' (60-80 palabras)",
      speaking: "Grabá 2 minutos describiendo tu casa. Dá un 'tour' por los ambientes, decí qué hay en cada uno usando 'hay', 'en', 'está'. Usá el vocabulario de la lección."
    },

    // A1 Unit 3 - Tiempo y Actividades
    '¿Qué Hora Es?': {
      writing: "Escribí tu horario de un día típico con 6-7 actividades. Decí a qué hora hacés cada cosa. Ejemplo: 'Me levanto a las siete de la mañana. Desayuno a las siete y media.' (60-80 palabras)",
      speaking: "Grabá 2 minutos diciendo qué hora es en diferentes momentos y describiendo tu horario diario. Practicá 'son las...', 'es la una', 'y media', 'y cuarto'."
    },
    'Los Días y los Meses': {
      writing: "Escribí sobre tu semana típica y fechas importantes. Mencioná qué hacés cada día y 2-3 fechas especiales (cumpleaños, fiestas). Ejemplo: 'Los lunes trabajo. Mi cumpleaños es en marzo.' (60-80 palabras)",
      speaking: "Grabá 2 minutos hablando sobre los días de la semana, qué hacés cada día, y mencioná algunas fechas importantes para vos usando meses y días."
    },
    'Actividades Básicas': {
      writing: "Escribí sobre tus actividades diarias y preferencias. Usá verbos regulares en presente y 'me gusta/no me gusta'. Ejemplo: 'Todos los días estudio español. Me gusta caminar pero no me gusta trabajar los domingos.' (70-90 palabras)",
      speaking: "Grabá 2-3 minutos hablando sobre lo que hacés normalmente, lo que te gusta y no te gusta hacer. Usá verbos en presente y expresiones de preferencia."
    }
  };

  // Check if we have a specific prompt for this lesson
  const specificPrompt = lessonPrompts[title];
  if (specificPrompt) {
    return specificPrompt[homeworkType];
  }

  // Generate contextual prompt based on lesson objectives and title
  return generateContextualPrompt(lessonInfo, homeworkType, level);
}

/**
 * Generate contextual prompt when no specific mapping exists
 */
function generateContextualPrompt(lessonInfo: any, homeworkType: 'writing' | 'speaking', level: string): string {
  const { title, objectives } = lessonInfo;
  
  // Extract key themes from title and objectives
  const themes = extractThemesFromLesson(title, objectives);
  
  if (homeworkType === 'writing') {
    if (level === 'A1') {
      return `Escribí 4-6 oraciones sobre ${themes.join(' y ')} usando el vocabulario y estructuras de la lección "${title}". Incluí ejemplos específicos y usá las expresiones que aprendiste. (50-80 palabras)`;
    } else if (level === 'A2') {
      return `Escribí un párrafo sobre ${themes.join(' y ')} aplicando lo que aprendiste en "${title}". Usá estructuras variadas y vocabulario específico de la lección. (80-120 palabras)`;
    } else {
      return `Redactá un texto sobre ${themes.join(' y ')} incorporando los conceptos de "${title}". Demostrá dominio de las estructuras y vocabulario estudiados. (150-250 palabras)`;
    }
  } else {
    if (level === 'A1') {
      return `Grabá 1-2 minutos hablando sobre ${themes.join(' y ')}. Usá el vocabulario y expresiones de la lección "${title}". Hablá despacio y claro.`;
    } else if (level === 'A2') {
      return `Grabá 2-3 minutos presentando ${themes.join(' y ')} usando lo aprendido en "${title}". Incluí ejemplos personales y usá estructuras variadas.`;
    } else {
      return `Grabá 3-5 minutos discutiendo ${themes.join(' y ')} aplicando los conceptos de "${title}". Demostrá fluidez y uso apropiado del vocabulario especializado.`;
    }
  }
}

/**
 * Extract themes from lesson title and objectives
 */
function extractThemesFromLesson(title: string, objectives: string[]): string[] {
  const titleThemes = title.toLowerCase();
  const themes: string[] = [];
  
  // Common theme mappings
  if (titleThemes.includes('salud') || titleThemes.includes('familia')) themes.push('la familia');
  if (titleThemes.includes('casa') || titleThemes.includes('hogar')) themes.push('la casa');
  if (titleThemes.includes('trabajo') || titleThemes.includes('profesión')) themes.push('el trabajo');
  if (titleThemes.includes('tiempo') || titleThemes.includes('hora')) themes.push('el tiempo');
  if (titleThemes.includes('comida') || titleThemes.includes('restaurante')) themes.push('la comida');
  if (titleThemes.includes('viaje') || titleThemes.includes('transporte')) themes.push('los viajes');
  if (titleThemes.includes('ropa') || titleThemes.includes('vestir')) themes.push('la ropa');
  if (titleThemes.includes('rutina') || titleThemes.includes('actividades')) themes.push('las actividades diarias');
  
  // If no themes found, use the title as theme
  if (themes.length === 0) {
    themes.push(title.toLowerCase());
  }
  
  return themes;
}

/**
 * Fallback to generic homework assignment
 */
async function assignGenericHomework(userId: string, lessonId: string, userLevel: string, supabase: any): Promise<HomeworkAssignment | null> {
  const level = userLevel.toUpperCase();
  if (!HOMEWORK_TEMPLATES[level as keyof typeof HOMEWORK_TEMPLATES]) {
    console.error('Invalid user level:', level);
    return null;
  }

  // Use original logic as fallback
  const adaptiveData = await analyzeUserWeaknesses(userId, supabase);
  const homeworkType = selectHomeworkType(adaptiveData);
  const prompts = HOMEWORK_TEMPLATES[level as keyof typeof HOMEWORK_TEMPLATES][homeworkType];
  const selectedPrompt = selectTargetedPrompt(prompts, adaptiveData);
  
  // Set due date (3 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  // Create homework assignment
  const { data: homework, error: homeworkError } = await supabase
    .from('homework')
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      type: homeworkType,
      prompt: selectedPrompt,
      due_at: dueDate.toISOString(),
      rubric_json: RUBRICS[homeworkType]
    })
    .select()
    .single();

  if (homeworkError) {
    console.error('Error creating homework:', homeworkError);
    return null;
  }

  return {
    id: homework.id,
    type: homework.type,
    prompt: homework.prompt,
    dueAt: homework.due_at,
    rubric: homework.rubric_json
  };
}