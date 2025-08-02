// Comprehensive Spanish Placement Exam System
// Assesses students across A1-B2 levels and places them appropriately

export interface PlacementQuestion {
  id: string;
  type: 'multiple-choice' | 'fill-blank' | 'translation' | 'reading-comprehension';
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  skill: 'grammar' | 'vocabulary' | 'reading' | 'culture';
  points: number;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topics: string[];
}

export interface PlacementResult {
  recommendedLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  recommendedUnit: number;
  recommendedLesson: number;
  confidenceScore: number; // 0-100
  strengths: string[];
  weaknesses: string[];
  detailedScores: {
    A1: number;
    A2: number;
    B1: number;
    B2: number;
    C1: number;
    C2: number;
  };
  skillBreakdown: {
    grammar: number;
    vocabulary: number;
    reading: number;
    culture: number;
  };
  recommendations: string[];
  estimatedStudyTime: string;
}

// Comprehensive placement exam questions covering all levels and skills
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // A1 Level Questions (Basic Survival Spanish)
  {
    id: 'a1-basic-greeting',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'vocabulary',
    points: 1,
    question: '¿Cómo se dice "Good morning" en español?',
    options: ['Buenas noches', 'Buenos días', 'Buenas tardes', 'Hasta luego'],
    correctAnswer: 'Buenos días',
    explanation: '"Buenos días" is the standard greeting for "Good morning" in Spanish.',
    topics: ['greetings', 'basic-courtesy']
  },
  {
    id: 'a1-ser-conjugation',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'grammar',
    points: 2,
    question: 'Yo _____ de Argentina.',
    options: ['soy', 'eres', 'es', 'son'],
    correctAnswer: 'soy',
    explanation: '"Soy" is the first person singular form of "ser" (to be) used for origin and identity.',
    topics: ['ser-conjugation', 'origin']
  },
  {
    id: 'a1-numbers',
    type: 'fill-blank',
    level: 'A1',
    skill: 'vocabulary',
    points: 1,
    question: 'Escribe el número: 15 = ________',
    correctAnswer: 'quince',
    explanation: 'Fifteen in Spanish is "quince".',
    topics: ['numbers', 'basic-counting']
  },
  {
    id: 'a1-family',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'vocabulary',
    points: 1,
    question: '¿Cómo se llama la hermana de tu padre?',
    options: ['Prima', 'Tía', 'Abuela', 'Sobrina'],
    correctAnswer: 'Tía',
    explanation: 'Your father\'s sister is your "tía" (aunt).',
    topics: ['family', 'relationships']
  },

  // A2 Level Questions (Elementary Spanish)
  {
    id: 'a2-reflexive-verbs',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'grammar',
    points: 3,
    question: 'Todos los días me _____ a las 7 de la mañana.',
    options: ['despierto', 'despierta', 'despiertas', 'despiertan'],
    correctAnswer: 'despierto',
    explanation: '"Despertarse" is reflexive. First person singular is "me despierto".',
    topics: ['reflexive-verbs', 'daily-routine']
  },
  {
    id: 'a2-past-tense',
    type: 'fill-blank',
    level: 'A2',
    skill: 'grammar',
    points: 3,
    question: 'Ayer _______ (comer) en un restaurante italiano.',
    correctAnswer: 'comí',
    explanation: '"Comí" is the preterite first person singular form of "comer".',
    topics: ['preterite', 'past-actions']
  },
  {
    id: 'a2-food-vocabulary',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'vocabulary',
    points: 2,
    question: '¿Qué necesitas para hacer un asado argentino?',
    options: ['Pescado y arroz', 'Carne y parrilla', 'Pollo y pasta', 'Verduras y sopa'],
    correctAnswer: 'Carne y parrilla',
    explanation: 'An Argentine "asado" requires meat and a grill ("parrilla").',
    topics: ['food', 'argentine-culture']
  },
  {
    id: 'a2-comparative',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'grammar',
    points: 3,
    question: 'Buenos Aires es _____ grande _____ Córdoba.',
    options: ['más... que', 'menos... de', 'tan... como', 'muy... para'],
    correctAnswer: 'más... que',
    explanation: '"Más... que" is used for comparative superiority (bigger than).',
    topics: ['comparatives', 'cities']
  },

  // B1 Level Questions (Intermediate Spanish)
  {
    id: 'b1-subjunctive-doubt',
    type: 'multiple-choice',
    level: 'B1',
    skill: 'grammar',
    points: 4,
    question: 'No creo que _____ lluvia mañana.',
    options: ['hay', 'haya', 'había', 'hubo'],
    correctAnswer: 'haya',
    explanation: 'After "no creo que" (expressing doubt), we use subjunctive "haya".',
    topics: ['subjunctive', 'doubt', 'weather']
  },

  {
    id: 'b1-por-para',
    type: 'multiple-choice',
    level: 'B1',
    skill: 'grammar',
    points: 4,
    question: 'Estudié toda la noche _____ el examen.',
    options: ['por', 'para', 'de', 'en'],
    correctAnswer: 'para',
    explanation: '"Para" indicates purpose or goal - studying FOR the exam.',
    topics: ['por-para', 'purpose']
  },
  {
    id: 'b1-reading-comprehension',
    type: 'reading-comprehension',
    level: 'B1',
    skill: 'reading',
    points: 5,
    question: `Lee el texto: "El tango nació en los barrios porteños de Buenos Aires a finales del siglo XIX. Aunque inicialmente fue rechazado por la clase alta, eventualmente se convirtió en un símbolo cultural de Argentina." 

¿Cuál es la idea principal?`,
    options: [
      'El tango es solo para la clase alta',
      'El tango se originó en Buenos Aires y se volvió culturalmente importante',
      'El tango nunca fue aceptado en Argentina',
      'El tango nació en el siglo XX'
    ],
    correctAnswer: 'El tango se originó en Buenos Aires y se volvió culturalmente importante',
    explanation: 'The text explains tango\'s origins in Buenos Aires and its evolution into a cultural symbol.',
    topics: ['reading-comprehension', 'tango', 'argentine-culture']
  },

  // B2 Level Questions (Upper-Intermediate Spanish)
  {
    id: 'b2-subjunctive-complex',
    type: 'multiple-choice',
    level: 'B2',
    skill: 'grammar',
    points: 5,
    question: 'Es fundamental que los gobiernos _____ medidas contra el cambio climático antes de que _____ demasiado tarde.',
    options: [
      'toman... es', 
      'tomen... sea', 
      'tomarían... sería', 
      'tomaron... fue'
    ],
    correctAnswer: 'tomen... sea',
    explanation: 'Both clauses require subjunctive: "es fundamental que" + subjunctive, "antes de que" + subjunctive.',
    topics: ['subjunctive', 'environmental-issues', 'complex-sentences']
  },
  {
    id: 'b2-passive-voice',
    type: 'fill-blank',
    level: 'B2',
    skill: 'grammar',
    points: 5,
    question: 'La nueva ley _______ _______ (aprobar) por el congreso la semana pasada.',
    correctAnswer: 'fue aprobada',
    explanation: 'Passive voice in past: "fue aprobada" (was approved).',
    topics: ['passive-voice', 'politics', 'past-tense']
  },
  {
    id: 'b2-business-vocabulary',
    type: 'multiple-choice',
    level: 'B2',
    skill: 'vocabulary',
    points: 4,
    question: 'Para lanzar su startup, necesitaba conseguir _____ de inversores.',
    options: ['financiación', 'finanzas', 'financiero', 'finanziar'],
    correctAnswer: 'financiación',
    explanation: '"Financiación" means financing/funding, necessary for launching a startup.',
    topics: ['business', 'entrepreneurship', 'startup-vocabulary']
  },
  {
    id: 'b2-complex-reading',
    type: 'reading-comprehension',
    level: 'B2',
    skill: 'reading',
    points: 6,
    question: `Lee el párrafo: "La globalización ha generado un debate complejo sobre su impacto en las culturas locales. Mientras algunos argumentan que promueve la diversidad cultural mediante el intercambio, otros sostienen que homogeniza las tradiciones, diluyendo la identidad cultural de las comunidades."

¿Cuál es la estructura argumentativa del texto?`,
    options: [
      'Presenta solo argumentos a favor de la globalización',
      'Muestra únicamente los aspectos negativos',
      'Presenta dos perspectivas contrastantes sobre el mismo tema',
      'Defiende una posición específica sin mencionar alternativas'
    ],
    correctAnswer: 'Presenta dos perspectivas contrastantes sobre el mismo tema',
    explanation: 'The text presents contrasting viewpoints: some argue for cultural diversity, others for homogenization.',
    topics: ['reading-comprehension', 'globalization', 'cultural-analysis']
  },
  {
    id: 'b2-reported-speech',
    type: 'multiple-choice',
    level: 'B2',
    skill: 'grammar',
    points: 5,
    question: 'El periodista informó que el presidente _____ una nueva política económica.',
    options: ['anunciaría', 'anunció', 'había anunciado', 'anunciarían'],
    correctAnswer: 'había anunciado',
    explanation: 'Reported speech with past reference requires pluperfect "había anunciado".',
    topics: ['reported-speech', 'media', 'past-perfect']
  },

  // Enhanced cultural and reading questions
  {
    id: 'a1-culture-mate',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'culture',
    points: 2,
    question: '¿Qué es el mate en Argentina?',
    options: ['Una comida típica', 'Una bebida tradicional', 'Un baile popular', 'Un deporte nacional'],
    correctAnswer: 'Una bebida tradicional',
    explanation: 'Mate is Argentina\'s traditional drink, shared among friends and family.',
    topics: ['argentine-culture', 'beverages', 'traditions']
  },
  {
    id: 'a2-reading-simple',
    type: 'reading-comprehension',
    level: 'A2',
    skill: 'reading',
    points: 3,
    question: `Lee el texto: "María trabaja en una oficina en el centro de Buenos Aires. Todos los días toma el subte para ir al trabajo. Le gusta su trabajo porque sus compañeros son muy amables."

¿Cómo va María al trabajo?`,
    options: ['En autobús', 'En subte', 'A pie', 'En taxi'],
    correctAnswer: 'En subte',
    explanation: 'The text clearly states "toma el subte para ir al trabajo" (takes the subway to work).',
    topics: ['reading-comprehension', 'transport', 'daily-routine']
  },
  {
    id: 'b1-reading-inference',
    type: 'reading-comprehension',
    level: 'B1',
    skill: 'reading',
    points: 4,
    question: `Lee el párrafo: "Aunque Santiago había estudiado inglés durante cinco años, se sintió nervioso al hablar con los turistas. Sin embargo, después de unas semanas trabajando en el hotel, ganó más confianza y ahora disfruta ayudando a los huéspedes internacionales."

¿Qué podemos inferir sobre Santiago?`,
    options: [
      'No sabía nada de inglés antes',
      'Siempre fue confiado hablando inglés',
      'Su confianza mejoró con la práctica',
      'No le gusta trabajar con turistas'
    ],
    correctAnswer: 'Su confianza mejoró con la práctica',
    explanation: 'The text shows Santiago\'s progression from nervousness to confidence through practice.',
    topics: ['reading-comprehension', 'inference', 'personal-development']
  },

  // Additional diagnostic questions for edge cases
  {
    id: 'diagnostic-informal-speech',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'culture',
    points: 2,
    question: 'En Argentina, ¿cómo dirías "you" informalmente?',
    options: ['Tú', 'Vos', 'Usted', 'Vosotros'],
    correctAnswer: 'Vos',
    explanation: 'In Argentina, "vos" is used instead of "tú" for informal "you".',
    topics: ['argentine-spanish', 'voseo', 'informal-speech']
  },
  {
    id: 'diagnostic-slang',
    type: 'multiple-choice',
    level: 'B1',
    skill: 'culture',
    points: 3,
    question: 'Si alguien en Buenos Aires dice "¡Qué copado!", significa:',
    options: ['Está muy cansado', 'Está muy enojado', 'Piensa que algo está genial', 'Tiene mucha hambre'],
    correctAnswer: 'Piensa que algo está genial',
    explanation: '"Copado" is Argentine slang meaning "cool" or "awesome".',
    topics: ['argentine-slang', 'colloquial-expressions']
  },

  // ==================== C1 LEVEL QUESTIONS ====================
  // Tests advanced subjunctive, literary tenses, complex discourse markers
  
  {
    id: 'c1-imperfect-subjunctive',
    type: 'multiple-choice',
    level: 'C1',
    skill: 'grammar',
    points: 6,
    question: 'Si el gobierno hubiera implementado las reformas antes, la economía _____ en mejor estado ahora.',
    options: ['estaría', 'estuviera', 'habría estado', 'estará'],
    correctAnswer: 'estaría',
    explanation: 'Mixed conditional: past perfect subjunctive in "si" clause + conditional in main clause for present result.',
    topics: ['mixed-conditionals', 'subjunctive', 'advanced-grammar']
  },
  {
    id: 'c1-literary-tense',
    type: 'multiple-choice',
    level: 'C1',
    skill: 'grammar',
    points: 6,
    question: 'En la novela, el narrador describe: "Apenas hubo terminado la ceremonia, los invitados se _____ a sus casas."',
    options: ['fueron', 'habían ido', 'hubieron ido', 'fuesen'],
    correctAnswer: 'fueron',
    explanation: 'After "apenas hubo + participle", use preterite for the main action in literary style.',
    topics: ['literary-tenses', 'preterite-anterior', 'narrative']
  },
  {
    id: 'c1-discourse-marker',
    type: 'multiple-choice',
    level: 'C1',
    skill: 'vocabulary',
    points: 5,
    question: 'La propuesta parecía viable; _____, los inversores mostraron cierto escepticismo.',
    options: ['sin embargo', 'no obstante', 'ahora bien', 'en tanto que'],
    correctAnswer: 'ahora bien',
    explanation: '"Ahora bien" introduces a contrasting consideration or caveat, more sophisticated than "sin embargo".',
    topics: ['discourse-markers', 'formal-register', 'argumentation']
  },
  {
    id: 'c1-subjunctive-adverbial',
    type: 'fill-blank',
    level: 'C1',
    skill: 'grammar',
    points: 6,
    question: 'El proyecto se realizará conforme se _____ (ir) aprobando las distintas etapas.',
    correctAnswer: 'vayan',
    explanation: 'With "conforme" (as/according to), use subjunctive for future/ongoing actions.',
    topics: ['adverbial-clauses', 'subjunctive', 'formal-writing']
  },
  {
    id: 'c1-register-distinction',
    type: 'multiple-choice',
    level: 'C1',
    skill: 'vocabulary',
    points: 5,
    question: 'En un contexto académico formal, para expresar "hacer algo mal", es más apropiado usar:',
    options: ['cagarla', 'meter la pata', 'incurrir en un error', 'equivocarse'],
    correctAnswer: 'incurrir en un error',
    explanation: '"Incurrir en un error" is the most formal/academic register for making a mistake.',
    topics: ['register', 'academic-language', 'formality-levels']
  },
  {
    id: 'c1-cultural-reference',
    type: 'multiple-choice',
    level: 'C1',
    skill: 'culture',
    points: 5,
    question: 'En Argentina, ¿qué significa la expresión "estar en el horno"?',
    options: ['Estar cocinando', 'Estar en una situación muy difícil', 'Estar muy bronceado', 'Estar trabajando mucho'],
    correctAnswer: 'Estar en una situación muy difícil',
    explanation: '"Estar en el horno" is an Argentine idiom meaning to be in serious trouble or a very difficult situation.',
    topics: ['argentine-idioms', 'colloquial-expressions', 'cultural-competence']
  },

  // ==================== C2 LEVEL QUESTIONS ====================
  // Tests near-native proficiency, subtle register differences, literary analysis
  
  {
    id: 'c2-stylistic-variation',
    type: 'multiple-choice',
    level: 'C2',
    skill: 'grammar',
    points: 7,
    question: 'En el ensayo literario, el autor emplea: "Fuera cual fuere su intención..." Esta construcción expresa:',
    options: ['Concesión enfática', 'Condición irreal', 'Duda epistemológica', 'Causa hipotética'],
    correctAnswer: 'Concesión enfática',
    explanation: '"Fuera cual fuere" (whatever it might be) is an emphatic concessive construction in elevated literary style.',
    topics: ['literary-analysis', 'concessive-constructions', 'stylistic-register']
  },
  {
    id: 'c2-semantic-nuance',
    type: 'multiple-choice',
    level: 'C2',
    skill: 'vocabulary',
    points: 7,
    question: 'Distingue el matiz semántico: "El político _____ su discurso con referencias históricas."',
    options: ['adoró', 'adornó', 'aderezó', 'adobó'],
    correctAnswer: 'aderezó',
    explanation: '"Aderezó" implies seasoning/enriching content sophisticatedly, while "adornó" is mere decoration.',
    topics: ['semantic-precision', 'lexical-sophistication', 'stylistic-choice']
  },
  {
    id: 'c2-intertextuality',
    type: 'reading-comprehension',
    level: 'C2',
    skill: 'reading',
    points: 8,
    question: `Analiza este fragmento: "Como dijera el tango, 'volver con la frente marchita', así regresaba el protagonista a su Buenos Aires natal, cargado no de años sino de desengaños."

¿Qué recurso literario predomina?`,
    options: ['Metáfora conceptual', 'Intertextualidad cultural', 'Sinestesia poética', 'Alegoría histórica'],
    correctAnswer: 'Intertextualidad cultural',
    explanation: 'The text references "Volver" tango, creating intertextual dialogue between literature and Argentine cultural memory.',
    topics: ['intertextuality', 'tango-culture', 'literary-analysis', 'cultural-references']
  },
  {
    id: 'c2-pragmatic-inference',
    type: 'multiple-choice',
    level: 'C2',
    skill: 'reading',
    points: 7,
    question: 'En una crítica literaria se lee: "La prosa del autor no carece de cierto encanto." El crítico sugiere que:',
    options: ['La prosa es muy encantadora', 'La prosa tiene algunos méritos menores', 'La prosa es perfectamente aceptable', 'La prosa carece completamente de encanto'],
    correctAnswer: 'La prosa tiene algunos méritos menores',
    explanation: 'The litotes "no carece de cierto" implies faint praise - acknowledging minimal positive qualities.',
    topics: ['pragmatic-inference', 'literary-criticism', 'implicit-meaning', 'euphemism']
  },
  {
    id: 'c2-sociolinguistic-competence',
    type: 'multiple-choice',
    level: 'C2',
    skill: 'culture',
    points: 7,
    question: 'Un porteño dice: "Che, ¿vos sabés que fulano está medio complicado con el tema aquel?" Esta formulación indica:',
    options: ['Información confidencial', 'Cortesía negativa', 'Distanciamiento epistémico', 'Registro familiar'],
    correctAnswer: 'Distanciamiento epistémico',
    explanation: 'Using vague terms ("fulano", "tema aquel", "medio") creates epistemic distance, showing uncertainty or discretion.',
    topics: ['sociolinguistics', 'epistemic-modality', 'pragmatic-competence', 'rioplatense-variety']
  }
];

// Helper function for error-tolerant answer comparison
function normalizeAnswer(answer: string): string {
  return answer
    .toLowerCase()
    .trim()
    .normalize('NFD') // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, '') // Remove accent marks
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// Scoring algorithm for placement
export function calculatePlacementResult(answers: { [questionId: string]: string }): PlacementResult {
  let totalPoints = 0;
  let earnedPoints = 0;
  let levelScores = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  let skillScores = { grammar: 0, vocabulary: 0, reading: 0, culture: 0 };
  let maxLevelScores = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
  let maxSkillScores = { grammar: 0, vocabulary: 0, reading: 0, culture: 0 };

  // Calculate scores
  PLACEMENT_QUESTIONS.forEach(question => {
    totalPoints += question.points;
    maxLevelScores[question.level] += question.points;
    maxSkillScores[question.skill] += question.points;

    const userAnswer = answers[question.id];
    let isCorrect = false;

    if (userAnswer) {
      if (question.type === 'fill-blank') {
        // Use error-tolerant comparison for fill-blank questions
        isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(question.correctAnswer);
      } else {
        // Exact match for multiple choice questions
        isCorrect = userAnswer === question.correctAnswer;
      }
    }

    if (isCorrect) {
      earnedPoints += question.points;
      levelScores[question.level] += question.points;
      skillScores[question.skill] += question.points;
    }
  });

  // Convert to percentages
  const levelPercentages = {
    A1: maxLevelScores.A1 > 0 ? Math.round((levelScores.A1 / maxLevelScores.A1) * 100) : 0,
    A2: maxLevelScores.A2 > 0 ? Math.round((levelScores.A2 / maxLevelScores.A2) * 100) : 0,
    B1: maxLevelScores.B1 > 0 ? Math.round((levelScores.B1 / maxLevelScores.B1) * 100) : 0,
    B2: maxLevelScores.B2 > 0 ? Math.round((levelScores.B2 / maxLevelScores.B2) * 100) : 0,
    C1: maxLevelScores.C1 > 0 ? Math.round((levelScores.C1 / maxLevelScores.C1) * 100) : 0,
    C2: maxLevelScores.C2 > 0 ? Math.round((levelScores.C2 / maxLevelScores.C2) * 100) : 0,
  };

  const skillPercentages = {
    grammar: maxSkillScores.grammar > 0 ? Math.round((skillScores.grammar / maxSkillScores.grammar) * 100) : 0,
    vocabulary: maxSkillScores.vocabulary > 0 ? Math.round((skillScores.vocabulary / maxSkillScores.vocabulary) * 100) : 0,
    reading: maxSkillScores.reading > 0 ? Math.round((skillScores.reading / maxSkillScores.reading) * 100) : 0,
    culture: maxSkillScores.culture > 0 ? Math.round((skillScores.culture / maxSkillScores.culture) * 100) : 0,
  };

  // Determine placement level based on scoring algorithm
  let recommendedLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' = 'A1';
  let recommendedUnit = 1;
  let recommendedLesson = 1;
  let confidenceScore = Math.round((earnedPoints / totalPoints) * 100);

  // Advanced placement algorithm with C1/C2 support
  if (levelPercentages.C2 >= 70 && levelPercentages.C1 >= 80 && levelPercentages.B2 >= 85) {
    recommendedLevel = 'C2';
    recommendedUnit = levelPercentages.C2 >= 85 ? 2 : 1;
  } else if (levelPercentages.C1 >= 70 && levelPercentages.B2 >= 80 && levelPercentages.B1 >= 85) {
    recommendedLevel = 'C1';
    recommendedUnit = levelPercentages.C1 >= 85 ? 2 : 1;
  } else if (levelPercentages.B2 >= 70) {
    recommendedLevel = 'B2';
    recommendedUnit = levelPercentages.B2 >= 85 ? 2 : 1;
  } else if (levelPercentages.B1 >= 70 && levelPercentages.A2 >= 80) {
    recommendedLevel = 'B1';
    recommendedUnit = levelPercentages.B1 >= 85 ? 2 : 1;
  } else if (levelPercentages.A2 >= 70 && levelPercentages.A1 >= 80) {
    recommendedLevel = 'A2';
    recommendedUnit = levelPercentages.A2 >= 85 ? 2 : 1;
  } else if (levelPercentages.A1 >= 50) {
    recommendedLevel = 'A1';
    recommendedUnit = levelPercentages.A1 >= 80 ? 2 : 1;
  }

  // Adjust for patchy knowledge (common in real-world learners)
  const hasSignificantGaps = Object.values(skillPercentages).some(score => score < 40);
  if (hasSignificantGaps && recommendedLevel !== 'A1') {
    // Drop one level if there are significant skill gaps
    const levels: ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const currentIndex = levels.indexOf(recommendedLevel);
    if (currentIndex > 0) {
      recommendedLevel = levels[currentIndex - 1];
      recommendedUnit = 2; // Start at unit 2 for review
    }
  }

  // Identify strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  Object.entries(skillPercentages).forEach(([skill, score]) => {
    if (score >= 75) strengths.push(skill);
    if (score < 50) weaknesses.push(skill);
  });

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (weaknesses.includes('grammar')) {
    recommendations.push('Focus on grammar fundamentals and verb conjugations');
  }
  if (weaknesses.includes('vocabulary')) {
    recommendations.push('Build core vocabulary through daily practice');
  }
  if (weaknesses.includes('reading')) {
    recommendations.push('Practice reading comprehension with graded texts');
  }
  if (weaknesses.includes('culture')) {
    recommendations.push('Learn more about Argentine culture and expressions');
  }

  // Estimate study time
  const levelHours = { 
    A1: '2-3 months', 
    A2: '3-4 months', 
    B1: '4-6 months', 
    B2: '6-8 months',
    C1: '8-12 months',
    C2: '12+ months'
  };
  const estimatedStudyTime = levelHours[recommendedLevel];

  return {
    recommendedLevel,
    recommendedUnit,
    recommendedLesson,
    confidenceScore,
    strengths,
    weaknesses,
    detailedScores: levelPercentages,
    skillBreakdown: skillPercentages,
    recommendations,
    estimatedStudyTime
  };
}