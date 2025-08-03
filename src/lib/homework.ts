import { createClient } from '@/lib/supabase/server';

// Homework prompts based on lesson level and type
const HOMEWORK_TEMPLATES = {
  A1: {
    writing: [
      "Escribe 5 oraciones simples sobre ti. Ejemplos: 'Me llamo María.', 'Tengo 25 años.', 'Soy de México.', 'Me gusta la pizza.', 'Estudio español.' (30-50 palabras total)",
      "Completa estas oraciones con tus datos: 'Hola, me llamo _____', 'Tengo _____ años', 'Vivo en _____', 'Me gusta _____', 'No me gusta _____'. Después escribe 2 oraciones más sobre ti. (30-50 palabras total)",
      "Escribe los días de la semana y escoge tu día favorito. Escribe 3 oraciones sobre qué haces ese día. Ejemplo: 'Mi día favorito es sábado. Duermo mucho. Como con mi familia.' (30-50 palabras total)",
    ],
    speaking: [
      "Graba 1 minuto presentándote muy básico: di tu nombre, edad, de dónde eres, y una cosa que te gusta. Habla MUY despacio. Ejemplo: 'Hola. Me llamo Ana. Tengo veinte años. Soy de Colombia. Me gusta el café.'",
      "Graba 1 minuto contando números del 1 al 20, después di los colores que conoces, y termina diciendo 3 cosas que hay en tu cuarto. Ejemplo: 'Uno, dos, tres... rojo, azul, verde... En mi cuarto hay una cama, una mesa, una ventana.'",
      "Graba 1 minuto hablando sobre comida. Di 3 comidas que te gustan y 2 que no te gustan. Usa 'Me gusta...' y 'No me gusta...'. Ejemplo: 'Me gusta la pizza. Me gusta el chocolate. Me gusta el arroz. No me gusta el brócoli. No me gusta el pescado.'",
    ]
  },
  A2: {
    writing: [
      "Escribe sobre tu día de ayer usando tiempo pasado simple. Cuenta 6-8 oraciones sobre qué hiciste. Ejemplos: 'Ayer me levanté a las 7. Desayuné cereal. Fui al trabajo en autobús.' (60-80 palabras total)",
      "Describe tu familia escribiendo 2 oraciones sobre cada persona. Usa 'es/está/tiene/le gusta'. Ejemplo: 'Mi mamá es doctora. Tiene 45 años. Mi papá está en casa. Le gusta cocinar.' (60-80 palabras total)", 
      "Escribe sobre tu ciudad comparándola con otra ciudad que conoces. Usa 'más grande', 'menos calor', 'mejor', 'peor'. Ejemplo: 'Mi ciudad es más pequeña que Madrid. Hace menos calor aquí. La comida es mejor en mi ciudad.' (60-80 palabras total)",
    ],
    speaking: [
      "Graba 2 minutos contando qué hiciste el fin de semana pasado. Usa tiempo pasado simple: 'fui', 'comí', 'vi', 'hablé'. Habla despacio y usa ejemplos concretos.",
      "Graba 2 minutos describiendo tu rutina diaria normal. Di a qué hora haces cada cosa: 'Me levanto a las...', 'Desayuno a las...', 'Voy al trabajo a las...'. Incluye al menos 6 actividades.",
      "Graba 2 minutos hablando sobre tu casa o apartamento. Describe cada cuarto y di qué hay ahí: 'En la cocina hay...', 'En el dormitorio tengo...', 'El baño está...'",
    ]
  },
  B1: {
    writing: [
      "Escribe un ensayo de 200-250 palabras sobre las ventajas y desventajas de la tecnología moderna. Estructura tu texto con introducción, desarrollo y conclusión.",
      "Redacta una carta formal de 200-250 palabras solicitando información sobre un curso de español. Usa el registro formal apropiado.",
      "Escribe tu opinión sobre el cambio climático en 200-250 palabras. Usa subjuntivo para expresar emociones y opiniones.",
    ],
    speaking: [
      "Graba un audio de 4-5 minutos expresando tu opinión sobre un tema social actual. Usa subjuntivo y estructuras complejas.",
      "Graba un audio de 4-5 minutos contando una historia inventada en pasado. Usa diferentes tiempos verbales y conectores narrativos.",
      "Graba un audio de 4-5 minutos haciendo una presentación sobre tu profesión ideal. Usa futuro y condicional.",
    ]
  },
  B2: {
    writing: [
      "Redacta un ensayo argumentativo de 300-400 palabras sobre el impacto de la globalización en las culturas locales. Utiliza conectores avanzados, subjuntivo, y ejemplos concretos para apoyar tu argumentación.",
      "Escribe un artículo de opinión de 300-400 palabras sobre el papel de los medios de comunicación en la sociedad actual. Analiza ventajas, desventajas y propón soluciones. Usa registro formal y estructuras complejas.",
      "Redacta una carta formal dirigida a las autoridades locales (300-400 palabras) proponiendo soluciones para un problema ambiental en tu comunidad. Usa subjuntivo, condicional y lenguaje persuasivo.",
      "Escribe un análisis comparativo de 300-400 palabras entre las tradiciones de tu país y las de un país hispanohablante. Utiliza estructuras de comparación, subjuntivo y vocabulario cultural avanzado."
    ],
    speaking: [
      "Graba un audio de 5-6 minutos presentando un proyecto de emprendimiento innovador. Incluye descripción del problema, solución propuesta, mercado objetivo y plan financiero. Usa futuro, condicional y vocabulario empresarial.",
      "Graba un audio de 5-6 minutos debatiendo sobre las ventajas y desventajas de la inteligencia artificial. Presenta argumentos sólidos, usa subjuntivo para expresar opiniones y dudas, y conectores argumentativos.",
      "Graba un audio de 5-6 minutos narrando una experiencia profesional significativa y las lecciones aprendidas. Usa tiempos narrativos complejos, discurso indirecto y reflexiona sobre el crecimiento personal.",
      "Graba un audio de 5-6 minutos explicando un problema social actual y proponiendo soluciones viables. Usa estructuras de hipótesis, subjuntivo en cláusulas adverbiales y vocabulario sociológico avanzado."
    ]
  },
  
  C1: {
    writing: [
      "Redacta un ensayo académico de 500-600 palabras analizando las implicaciones socioculturales de un fenómeno contemporáneo. Utiliza al menos cinco fuentes teóricas, estructuras argumentativas complejas, registro académico formal, y un aparato crítico sofisticado.",
      "Escribe un artículo de análisis literario de 500-600 palabras sobre un texto de la literatura hispanoamericana, examinando recursos estilísticos, intertextualidad, y contexto sociocultural. Emplea terminología especializada, subjuntivo en contextos complejos, y estructuras concesivas avanzadas.",
      "Redacta una propuesta de investigación de 500-600 palabras para un proyecto interdisciplinario. Incluye justificación teórica, metodología, hipótesis, y cronograma. Usa registro académico, estructuras de modalidad epistémica, y vocabulario especializado.",
      "Escribe un ensayo crítico de 500-600 palabras sobre las transformaciones del español rioplatense en el contexto de la globalización. Analiza variación sociolingüística, influencias extranjeras, y resistencias identitarias usando marcos teóricos especializados."
    ],
    speaking: [
      "Graba un audio de 7-8 minutos presentando una conferencia académica sobre tu área de especialización. Incluye marco teórico, análisis crítico, y proyecciones futuras. Usa registro formal, estructuras complejas, y terminología especializada con fluidez natural.",
      "Graba un audio de 7-8 minutos conduciendo un debate intelectual sobre un dilema ético contemporáneo. Presenta múltiples perspectivas, utiliza argumentación sofisticada, estructuras concesivas complejas, y demuestra competencia pragmática avanzada.",
      "Graba un audio de 7-8 minutos analizando críticamente un fenómeno cultural argentino desde múltiples disciplinas. Integra perspectivas históricas, sociológicas, y antropológicas con fluidez y precisión terminológica.",
      "Graba un audio de 7-8 minutos moderando una mesa redonda imaginaria entre expertos sobre cambio climático. Demuestra capacidad de síntesis, reformulación sofisticada, y manejo de registros múltiples según los interlocutores."
    ]
  },
  
  C2: {
    writing: [
      "Compone un ensayo crítico de 700-800 palabras sobre la evolución del concepto de identidad nacional en la literatura argentina del siglo XXI. Integra teoría literaria contemporánea, análisis intertextual profundo, y reflexión metacrítica. Demuestra precisión estilística y sofisticación argumentativa de nivel experto.",
      "Redacta un artículo de opinión de 700-800 palabras para una publicación académica internacional sobre las tensiones entre tradición y modernidad en las prácticas culturales rioplatenses. Utiliza un estilo erudito pero accesible, con matices retóricos sutiles y competencia intercultural avanzada.",
      "Escribe una reseña crítica de 700-800 palabras evaluando una obra teórica reciente en tu campo de experticia. Demuestra capacidad de síntesis conceptual, análisis epistemológico, y posicionamiento crítico original con elegancia estilística y precisión terminológica.",
      "Redacta un texto híbrido de 700-800 palabras que combine análisis académico y reflexión personal sobre el impacto de la tecnología en la cognición humana. Experimenta con registros múltiples, intertextualidad sofisticada, y estructuras argumentativas innovadoras."
    ],
    speaking: [
      "Graba un audio de 10-12 minutos improvisando una conferencia magistral sobre las implicaciones filosóficas de la inteligencia artificial. Demuestra elocuencia natural, capacidad de conceptualización en tiempo real, manejo experto de pausas y énfasis, y adaptación espontánea a complejidades conceptuales emergentes.",
      "Graba un audio de 10-12 minutos ofreciendo una masterclass sobre comunicación intercultural para profesionales de élite. Exhibe maestría pedagógica, capacidad de ejemplificación sofisticada, modulación de registro según audiencia, y competencia metapragmática avanzada.",
      "Graba un audio de 10-12 minutos interpretando y comentando un texto literario complejo en tiempo real (lectura incluida). Demuestra capacidad hermenéutica instantánea, sensibilidad estética refinada, competencia intertextual, y fluidez analítica de nivel crítico profesional.",
      "Graba un audio de 10-12 minutos improvisando un análisis comparativo entre dos sistemas filosóficos o corrientes artísticas. Muestra capacidad de síntesis conceptual espontánea, argumentación dialéctica sofisticada, y elegancia expresiva con precisión terminológica experta."
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
    
    // Determine lesson level (A1, A2, B1, B2, C1, C2)
    const level = userLevel.toUpperCase();
    if (!HOMEWORK_TEMPLATES[level as keyof typeof HOMEWORK_TEMPLATES]) {
      console.error('Invalid user level:', level);
      return null;
    }

    // 🎯 ADAPTIVE ASSIGNMENT: Analyze user's error patterns and weaknesses
    const adaptiveData = await analyzeUserWeaknesses(userId, supabase);
    console.log('🔍 Adaptive homework assignment data:', adaptiveData);

    // Intelligently select homework type based on user's needs
    const homeworkType = selectHomeworkType(adaptiveData);
    console.log('📝 Selected homework type based on analysis:', homeworkType);
    
    // Get targeted prompt for the level and type, considering user's weak areas
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
    // Get top error patterns from recent lessons and homework
    const { data: errors } = await supabase
      .from('error_logs')
      .select('error_type, count')
      .eq('user_id', userId)
      .order('count', { ascending: false })
      .limit(5);

    // Get weakest skills from progress tracking
    const { data: skills } = await supabase
      .from('skill_progress')
      .select('skill_code, sm2_easiness, failures, successes')
      .eq('user_id', userId)
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
      topErrors: errors?.map((e: any) => ({ type: e.error_type, count: e.count })) || [],
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