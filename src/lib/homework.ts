import { createClient } from '@/lib/supabase/server';

// Homework prompts based on lesson level and type
const HOMEWORK_TEMPLATES = {
  A1: {
    writing: [
      "Escribe una presentación personal de 100-150 palabras. Incluye tu nombre, edad, de dónde eres, qué te gusta hacer, y describe a tu familia.",
      "Describe tu rutina diaria en 100-150 palabras. Usa verbos en presente y incluye horarios específicos.",
      "Escribe sobre tu comida favorita en 100-150 palabras. Describe qué es, cómo se hace básicamente, y por qué te gusta.",
    ],
    speaking: [
      "Graba un audio de 2-3 minutos presentándote. Habla sobre tu nombre, edad, familia, y qué haces en tu tiempo libre. Habla despacio y con claridad.",
      "Graba un audio de 2-3 minutos describiendo tu casa o apartamento. Menciona las habitaciones que tiene y qué hay en cada una.",
      "Graba un audio de 2-3 minutos hablando sobre tus actividades del fin de semana. Usa el presente simple.",
    ]
  },
  A2: {
    writing: [
      "Escribe una carta informal de 150-200 palabras a un amigo contándole sobre tus últimas vacaciones. Usa el pretérito perfecto y describe lugares que visitaste.",
      "Redacta un texto de 150-200 palabras comparando la vida en la ciudad vs. la vida en el campo. Usa comparativos y superlativos.",
      "Escribe sobre una experiencia pasada importante en tu vida (150-200 palabras). Usa tiempos pasados y conectores temporales.",
    ],
    speaking: [
      "Graba un audio de 3-4 minutos contando una anécdota personal interesante. Usa tiempos pasados y trata de ser expresivo.",
      "Graba un audio de 3-4 minutos dando consejos sobre cómo aprender un idioma. Usa el imperativo y expresiones de recomendación.",
      "Graba un audio de 3-4 minutos describiendo tu ciudad natal y recomendando lugares para visitar.",
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
    
    // Determine lesson level (A1, A2, B1)
    const level = userLevel.toUpperCase();
    if (!HOMEWORK_TEMPLATES[level as keyof typeof HOMEWORK_TEMPLATES]) {
      console.error('Invalid user level:', level);
      return null;
    }

    // Randomly select homework type (70% writing, 30% speaking for variety)
    const homeworkType = Math.random() < 0.7 ? 'writing' : 'speaking';
    
    // Get random prompt for the level and type
    const prompts = HOMEWORK_TEMPLATES[level as keyof typeof HOMEWORK_TEMPLATES][homeworkType];
    const selectedPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    
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