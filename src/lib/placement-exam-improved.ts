// Improved Spanish Placement Exam System
// A1-B2 levels with adaptive testing and cultural neutrality

export interface PlacementQuestion {
  id: string;
  type: 'multiple-choice' | 'fill-blank' | 'reading-comprehension';
  level: 'A1' | 'A2' | 'B1' | 'B2';
  skill: 'grammar' | 'vocabulary' | 'reading';
  points: number;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  topics: string[];
  isCore?: boolean; // Core questions that must be answered for accurate placement
}

export interface PlacementResult {
  recommendedLevel: 'A1' | 'A2' | 'B1' | 'B2';
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
  };
  skillBreakdown: {
    grammar: number;
    vocabulary: number;
    reading: number;
  };
  recommendations: string[];
  estimatedStudyTime: string;
  questionsAnswered: number;
  totalQuestions: number;
}

// Balanced question pool with equal representation across levels and skills
export const PLACEMENT_QUESTIONS: PlacementQuestion[] = [
  // ==================== A1 LEVEL (8 questions) ====================
  
  // A1 Grammar (3 questions)
  {
    id: 'a1-ser-estar-basic',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'grammar',
    points: 1,
    question: 'María _____ profesora.',
    options: ['es', 'está', 'son', 'están'],
    correctAnswer: 'es',
    explanation: '"Es" is used with "ser" for permanent characteristics like profession.',
    topics: ['ser-estar', 'professions'],
    isCore: true
  },
  {
    id: 'a1-present-tense',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'grammar',
    points: 1,
    question: 'Nosotros _____ español todos los días.',
    options: ['estudia', 'estudias', 'estudiamos', 'estudian'],
    correctAnswer: 'estudiamos',
    explanation: '"Estudiamos" is the first person plural form of "estudiar".',
    topics: ['present-tense', 'regular-verbs'],
    isCore: true
  },
  {
    id: 'a1-articles',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'grammar',
    points: 1,
    question: '_____ mesa es grande.',
    options: ['El', 'La', 'Los', 'Las'],
    correctAnswer: 'La',
    explanation: '"Mesa" is feminine, so it takes the feminine article "la".',
    topics: ['definite-articles', 'gender']
  },

  // A1 Vocabulary (3 questions)
  {
    id: 'a1-numbers',
    type: 'fill-blank',
    level: 'A1',
    skill: 'vocabulary',
    points: 1,
    question: 'Escribe el número: 7 = _______',
    correctAnswer: 'siete',
    explanation: 'Seven in Spanish is "siete".',
    topics: ['numbers', 'basic-counting'],
    isCore: true
  },
  {
    id: 'a1-colors',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'vocabulary',
    points: 1,
    question: 'El sol es _______.',
    options: ['azul', 'verde', 'amarillo', 'negro'],
    correctAnswer: 'amarillo',
    explanation: 'The sun is yellow ("amarillo").',
    topics: ['colors', 'nature']
  },
  {
    id: 'a1-family',
    type: 'multiple-choice',
    level: 'A1',
    skill: 'vocabulary',
    points: 1,
    question: 'La madre de mi madre es mi _______.',
    options: ['tía', 'prima', 'abuela', 'hermana'],
    correctAnswer: 'abuela',
    explanation: 'Your mother\'s mother is your grandmother ("abuela").',
    topics: ['family', 'relationships']
  },

  // A1 Reading (2 questions)
  {
    id: 'a1-reading-simple',
    type: 'reading-comprehension',
    level: 'A1',
    skill: 'reading',
    points: 2,
    question: `Lee el texto: "Ana tiene 25 años. Vive en Madrid con su gato. Trabaja en una oficina. Le gusta leer libros."

¿Dónde vive Ana?`,
    options: ['Barcelona', 'Madrid', 'Valencia', 'Sevilla'],
    correctAnswer: 'Madrid',
    explanation: 'The text clearly states "Vive en Madrid" (She lives in Madrid).',
    topics: ['reading-comprehension', 'personal-information']
  },
  {
    id: 'a1-reading-routine',
    type: 'reading-comprehension',
    level: 'A1',
    skill: 'reading',
    points: 2,
    question: `Lee el texto: "Pedro se levanta a las 7:00. Desayuna café y tostadas. Va al trabajo en autobús."

¿Cómo va Pedro al trabajo?`,
    options: ['A pie', 'En coche', 'En autobús', 'En bicicleta'],
    correctAnswer: 'En autobús',
    explanation: 'The text states "Va al trabajo en autobús" (He goes to work by bus).',
    topics: ['reading-comprehension', 'daily-routine', 'transportation']
  },

  // ==================== A2 LEVEL (8 questions) ====================
  
  // A2 Grammar (3 questions)
  {
    id: 'a2-preterite',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'grammar',
    points: 2,
    question: 'Ayer _____ (comer) en un restaurante.',
    options: ['como', 'comí', 'comía', 'comeré'],
    correctAnswer: 'comí',
    explanation: '"Comí" is the preterite first person singular form for completed past actions.',
    topics: ['preterite', 'past-tense'],
    isCore: true
  },
  {
    id: 'a2-reflexive',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'grammar',
    points: 2,
    question: 'Ella se _____ muy temprano.',
    options: ['levanta', 'levanto', 'levantas', 'levantan'],
    correctAnswer: 'levanta',
    explanation: 'With reflexive verbs, "se levanta" is third person singular.',
    topics: ['reflexive-verbs', 'daily-routine'],
    isCore: true
  },
  {
    id: 'a2-imperfect',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'grammar',
    points: 2,
    question: 'Cuando era niño, _____ mucho chocolate.',
    options: ['comí', 'como', 'comía', 'comeré'],
    correctAnswer: 'comía',
    explanation: 'Imperfect "comía" is used for habitual actions in the past.',
    topics: ['imperfect', 'childhood', 'habitual-actions']
  },

  // A2 Vocabulary (3 questions)
  {
    id: 'a2-weather',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'vocabulary',
    points: 2,
    question: 'En invierno hace mucho _______.',
    options: ['calor', 'frío', 'viento', 'sol'],
    correctAnswer: 'frío',
    explanation: 'In winter it\'s very cold ("hace mucho frío").',
    topics: ['weather', 'seasons']
  },
  {
    id: 'a2-house',
    type: 'multiple-choice',
    level: 'A2',
    skill: 'vocabulary',
    points: 2,
    question: 'Duermo en el _______.',
    options: ['baño', 'cocina', 'dormitorio', 'jardín'],
    correctAnswer: 'dormitorio',
    explanation: 'You sleep in the bedroom ("dormitorio").',
    topics: ['house', 'rooms']
  },
  {
    id: 'a2-clothing',
    type: 'fill-blank',
    level: 'A2',
    skill: 'vocabulary',
    points: 2,
    question: 'En los pies llevamos _______.',
    correctAnswer: 'zapatos',
    explanation: 'On our feet we wear shoes ("zapatos").',
    topics: ['clothing', 'body-parts']
  },

  // A2 Reading (2 questions)
  {
    id: 'a2-reading-past',
    type: 'reading-comprehension',
    level: 'A2',
    skill: 'reading',
    points: 3,
    question: `Lee el texto: "El fin de semana pasado fui al cine con mis amigos. Vimos una película muy divertida. Después cenamos pizza y hablamos hasta muy tarde."

¿Qué hicieron después del cine?`,
    options: ['Fueron a casa', 'Cenaron pizza', 'Vieron otra película', 'Fueron de compras'],
    correctAnswer: 'Cenaron pizza',
    explanation: 'The text states "Después cenamos pizza" (Afterwards we had pizza for dinner).',
    topics: ['reading-comprehension', 'past-events', 'leisure']
  },
  {
    id: 'a2-reading-description',
    type: 'reading-comprehension',
    level: 'A2',
    skill: 'reading',
    points: 3,
    question: `Lee el texto: "Mi hermana es muy alta y tiene el pelo rubio. Le gusta mucho la música y toca la guitarra. Estudia medicina en la universidad."

¿Qué estudia la hermana?`,
    options: ['Música', 'Medicina', 'Arte', 'Literatura'],
    correctAnswer: 'Medicina',
    explanation: 'The text clearly states "Estudia medicina en la universidad".',
    topics: ['reading-comprehension', 'physical-description', 'studies']
  },

  // ==================== B1 LEVEL (8 questions) ====================
  
  // B1 Grammar (3 questions)
  {
    id: 'b1-subjunctive-basic',
    type: 'multiple-choice',
    level: 'B1',
    skill: 'grammar',
    points: 3,
    question: 'Espero que _____ buen tiempo mañana.',
    options: ['hace', 'haga', 'hacía', 'hará'],
    correctAnswer: 'haga',
    explanation: 'After "espero que" (expressing hope), we use subjunctive "haga".',
    topics: ['subjunctive', 'hope', 'weather'],
    isCore: true
  },
  {
    id: 'b1-por-para',
    type: 'multiple-choice',
    level: 'B1',
    skill: 'grammar',
    points: 3,
    question: 'Estudié toda la noche _____ el examen.',
    options: ['por', 'para', 'de', 'con'],
    correctAnswer: 'para',
    explanation: '"Para" indicates purpose or goal - studying FOR the exam.',
    topics: ['por-para', 'purpose'],
    isCore: true
  },
  {
    id: 'b1-conditional',
    type: 'multiple-choice',
    level: 'B1',
    skill: 'grammar',
    points: 3,
    question: 'Si tuviera dinero, _____ un coche nuevo.',
    options: ['compro', 'compré', 'compraría', 'compre'],
    correctAnswer: 'compraría',
    explanation: 'In conditional sentences with "si + imperfect subjunctive", use conditional tense.',
    topics: ['conditional', 'hypothetical-situations']
  },

  // B1 Vocabulary (3 questions)
  {
    id: 'b1-emotions',
    type: 'multiple-choice',
    level: 'B1',
    skill: 'vocabulary',
    points: 3,
    question: 'Cuando perdí mi trabajo, me sentí muy _______.',
    options: ['alegre', 'preocupado', 'emocionado', 'orgulloso'],
    correctAnswer: 'preocupado',
    explanation: 'Losing a job would make someone worried ("preocupado").',
    topics: ['emotions', 'work', 'feelings']
  },
  {
    id: 'b1-health',
    type: 'fill-blank',
    level: 'B1',
    skill: 'vocabulary',
    points: 3,
    question: 'Cuando tienes dolor de cabeza, puedes tomar un _______.',
    correctAnswer: 'analgésico',
    explanation: 'For headaches, you can take a painkiller ("analgésico").',
    topics: ['health', 'medicine', 'symptoms']
  },
  {
    id: 'b1-technology',
    type: 'multiple-choice',
    level: 'B1',
    skill: 'vocabulary',
    points: 3,
    question: 'Para conectarte a internet necesitas una buena _______.',
    options: ['pantalla', 'conexión', 'batería', 'memoria'],
    correctAnswer: 'conexión',
    explanation: 'To connect to internet you need a good connection ("conexión").',
    topics: ['technology', 'internet']
  },

  // B1 Reading (2 questions)
  {
    id: 'b1-reading-opinion',
    type: 'reading-comprehension',
    level: 'B1',
    skill: 'reading',
    points: 4,
    question: `Lee el texto: "Aunque las redes sociales nos permiten estar conectados, también pueden crear adicción. Es importante encontrar un equilibrio entre el mundo digital y la vida real."

¿Cuál es la opinión del autor?`,
    options: [
      'Las redes sociales son completamente negativas',
      'Debemos eliminar las redes sociales',
      'Es necesario equilibrar el uso de redes sociales',
      'Las redes sociales no tienen problemas'
    ],
    correctAnswer: 'Es necesario equilibrar el uso de redes sociales',
    explanation: 'The author suggests finding balance between digital and real life.',
    topics: ['reading-comprehension', 'social-media', 'opinion']
  },
  {
    id: 'b1-reading-inference',
    type: 'reading-comprehension',
    level: 'B1',
    skill: 'reading',
    points: 4,
    question: `Lee el párrafo: "Carlos había estudiado francés durante tres años, pero cuando llegó a París se sintió inseguro. Sin embargo, después de unas semanas, comenzó a comunicarse con más confianza."

¿Qué podemos inferir?`,
    options: [
      'Carlos no sabía francés',
      'París es difícil para los turistas',
      'La práctica mejora la confianza',
      'Carlos no quería hablar francés'
    ],
    correctAnswer: 'La práctica mejora la confianza',
    explanation: 'The text shows how practice led to increased confidence.',
    topics: ['reading-comprehension', 'inference', 'language-learning']
  },

  // ==================== B2 LEVEL (8 questions) ====================
  
  // B2 Grammar (3 questions)
  {
    id: 'b2-subjunctive-complex',
    type: 'multiple-choice',
    level: 'B2',
    skill: 'grammar',
    points: 4,
    question: 'Es importante que los estudiantes _____ responsables con sus estudios.',
    options: ['son', 'sean', 'serían', 'fueron'],
    correctAnswer: 'sean',
    explanation: 'After "es importante que", we use present subjunctive "sean".',
    topics: ['subjunctive', 'education', 'responsibility'],
    isCore: true
  },
  {
    id: 'b2-passive-voice',
    type: 'multiple-choice',
    level: 'B2',
    skill: 'grammar',
    points: 4,
    question: 'La nueva ley _____ _____ por el parlamento.',
    options: ['ha sido aprobada', 'ha aprobado', 'fue aprobando', 'está aprobada'],
    correctAnswer: 'ha sido aprobada',
    explanation: 'Passive voice with present perfect: "ha sido aprobada" (has been approved).',
    topics: ['passive-voice', 'politics', 'present-perfect']
  },
  {
    id: 'b2-reported-speech',
    type: 'multiple-choice',
    level: 'B2',
    skill: 'grammar',
    points: 4,
    question: 'El director dijo que la reunión _____ a las tres.',
    options: ['empezará', 'empezaría', 'empezó', 'empiece'],
    correctAnswer: 'empezaría',
    explanation: 'In reported speech, future becomes conditional "empezaría".',
    topics: ['reported-speech', 'work', 'meetings']
  },

  // B2 Vocabulary (3 questions)
  {
    id: 'b2-environment',
    type: 'multiple-choice',
    level: 'B2',
    skill: 'vocabulary',
    points: 4,
    question: 'El calentamiento global es una _____ seria para nuestro planeta.',
    options: ['ventaja', 'amenaza', 'oportunidad', 'solución'],
    correctAnswer: 'amenaza',
    explanation: 'Global warming is a serious threat ("amenaza") to our planet.',
    topics: ['environment', 'climate-change']
  },
  {
    id: 'b2-economics',
    type: 'fill-blank',
    level: 'B2',
    skill: 'vocabulary',
    points: 4,
    question: 'La crisis económica provocó un aumento del _______.',
    correctAnswer: 'desempleo',
    explanation: 'Economic crisis causes an increase in unemployment ("desempleo").',
    topics: ['economics', 'employment', 'crisis']
  },
  {
    id: 'b2-abstract-concepts',
    type: 'multiple-choice',
    level: 'B2',
    skill: 'vocabulary',
    points: 4,
    question: 'La _____ entre culturas diferentes enriquece la sociedad.',
    options: ['competencia', 'diversidad', 'uniformidad', 'separación'],
    correctAnswer: 'diversidad',
    explanation: 'Diversity ("diversidad") between cultures enriches society.',
    topics: ['society', 'culture', 'diversity']
  },

  // B2 Reading (2 questions)
  {
    id: 'b2-reading-analysis',
    type: 'reading-comprehension',
    level: 'B2',
    skill: 'reading',
    points: 5,
    question: `Lee el texto: "La globalización ha transformado la economía mundial, creando tanto oportunidades como desafíos. Mientras que ha facilitado el comercio internacional, también ha aumentado la desigualdad en algunos países."

¿Cuál es la estructura del argumento?`,
    options: [
      'Solo presenta beneficios',
      'Solo presenta problemas',
      'Presenta una perspectiva equilibrada',
      'Rechaza completamente la globalización'
    ],
    correctAnswer: 'Presenta una perspectiva equilibrada',
    explanation: 'The text presents both opportunities and challenges of globalization.',
    topics: ['reading-comprehension', 'globalization', 'argumentation']
  },
  {
    id: 'b2-reading-critical',
    type: 'reading-comprehension',
    level: 'B2',
    skill: 'reading',
    points: 5,
    question: `Lee el párrafo: "Los expertos sugieren que el futuro del trabajo será muy diferente. La automatización eliminará algunos empleos, pero también creará nuevas oportunidades en sectores tecnológicos."

¿Qué actitud tienen los expertos?`,
    options: [
      'Completamente pesimista',
      'Completamente optimista',
      'Realista y equilibrada',
      'Indiferente al cambio'
    ],
    correctAnswer: 'Realista y equilibrada',
    explanation: 'Experts acknowledge both job losses and new opportunities - a balanced view.',
    topics: ['reading-comprehension', 'future-work', 'technology']
  }
];

// Adaptive testing logic
export class AdaptivePlacementExam {
  private answers: { [questionId: string]: string } = {};
  private currentLevel: 'A1' | 'A2' | 'B1' | 'B2' = 'A1';
  private questionsAsked: PlacementQuestion[] = [];
  private levelConfidence: { [key: string]: number } = { A1: 0, A2: 0, B1: 0, B2: 0 };
  
  constructor() {
    this.reset();
  }

  reset() {
    this.answers = {};
    this.currentLevel = 'A1';
    this.questionsAsked = [];
    this.levelConfidence = { A1: 0, A2: 0, B1: 0, B2: 0 };
  }

  getNextQuestion(): PlacementQuestion | null {
    // If we've asked enough questions and have clear placement, stop
    if (this.shouldStopExam()) {
      return null;
    }

    // Get questions for current level that haven't been asked
    const availableQuestions = PLACEMENT_QUESTIONS.filter(q => 
      q.level === this.currentLevel && 
      !this.questionsAsked.find(asked => asked.id === q.id)
    );

    if (availableQuestions.length === 0) {
      // No more questions at this level, move to next or stop
      if (this.shouldMoveToNextLevel()) {
        this.currentLevel = this.getNextLevel();
        return this.getNextQuestion();
      }
      return null;
    }

    // Prioritize core questions
    const coreQuestions = availableQuestions.filter(q => q.isCore);
    const questionToAsk = coreQuestions.length > 0 ? 
      coreQuestions[0] : availableQuestions[0];

    this.questionsAsked.push(questionToAsk);
    return questionToAsk;
  }

  submitAnswer(questionId: string, answer: string): void {
    this.answers[questionId] = answer;
    this.updateLevelConfidence(questionId, answer);
  }

  private updateLevelConfidence(questionId: string, answer: string): void {
    const question = PLACEMENT_QUESTIONS.find(q => q.id === questionId);
    if (!question) return;

    const isCorrect = this.isAnswerCorrect(question, answer);
    const weight = question.isCore ? 1.5 : 1.0;
    
    if (isCorrect) {
      this.levelConfidence[question.level] += question.points * weight;
    } else {
      this.levelConfidence[question.level] -= question.points * weight * 0.5;
    }
  }

  private isAnswerCorrect(question: PlacementQuestion, answer: string): boolean {
    if (question.type === 'fill-blank') {
      return this.normalizeAnswer(answer) === this.normalizeAnswer(question.correctAnswer);
    }
    return answer === question.correctAnswer;
  }

  private normalizeAnswer(answer: string): string {
    return answer
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');
  }

  private shouldStopExam(): boolean {
    // Stop if we have clear confidence in a level and have asked enough questions
    const minQuestionsPerLevel = 3;
    const questionsAtCurrentLevel = this.questionsAsked.filter(q => q.level === this.currentLevel).length;
    
    if (questionsAtCurrentLevel < minQuestionsPerLevel) {
      return false;
    }

    // Check if we have clear placement
    const currentLevelScore = this.levelConfidence[this.currentLevel];
    const maxPossibleAtLevel = this.getMaxPossibleScore(this.currentLevel);
    
    // If scoring very well at current level (>80%), try next level
    if (currentLevelScore / maxPossibleAtLevel > 0.8 && this.currentLevel !== 'B2') {
      return false;
    }
    
    // If scoring poorly at current level (<40%), place at previous level
    if (currentLevelScore / maxPossibleAtLevel < 0.4 && this.currentLevel !== 'A1') {
      return true;
    }
    
    // If we've tested enough and have reasonable confidence, stop
    return this.questionsAsked.length >= 12; // Maximum 12 questions
  }

  private shouldMoveToNextLevel(): boolean {
    const currentLevelScore = this.levelConfidence[this.currentLevel];
    const maxPossibleAtLevel = this.getMaxPossibleScore(this.currentLevel);
    
    // Move to next level if scoring well (>70%) and not at highest level
    return (currentLevelScore / maxPossibleAtLevel > 0.7) && this.currentLevel !== 'B2';
  }

  private getNextLevel(): 'A1' | 'A2' | 'B1' | 'B2' {
    const levels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
    const currentIndex = levels.indexOf(this.currentLevel);
    return currentIndex < levels.length - 1 ? levels[currentIndex + 1] : 'B2';
  }

  private getMaxPossibleScore(level: string): number {
    return PLACEMENT_QUESTIONS
      .filter(q => q.level === level)
      .reduce((sum, q) => sum + q.points, 0);
  }

  calculateFinalResult(): PlacementResult {
    // Calculate detailed scores
    const levelScores = { A1: 0, A2: 0, B1: 0, B2: 0 };
    const skillScores = { grammar: 0, vocabulary: 0, reading: 0 };
    const maxLevelScores = { A1: 0, A2: 0, B1: 0, B2: 0 };
    const maxSkillScores = { grammar: 0, vocabulary: 0, reading: 0 };

    let totalPoints = 0;
    let earnedPoints = 0;

    this.questionsAsked.forEach(question => {
      totalPoints += question.points;
      maxLevelScores[question.level] += question.points;
      maxSkillScores[question.skill] += question.points;

      const userAnswer = this.answers[question.id];
      if (userAnswer && this.isAnswerCorrect(question, userAnswer)) {
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
    };

    const skillPercentages = {
      grammar: maxSkillScores.grammar > 0 ? Math.round((skillScores.grammar / maxSkillScores.grammar) * 100) : 0,
      vocabulary: maxSkillScores.vocabulary > 0 ? Math.round((skillScores.vocabulary / maxSkillScores.vocabulary) * 100) : 0,
      reading: maxSkillScores.reading > 0 ? Math.round((skillScores.reading / maxSkillScores.reading) * 100) : 0,
    };

    // Determine final placement
    let recommendedLevel: 'A1' | 'A2' | 'B1' | 'B2' = 'A1';
    
    if (levelPercentages.B2 >= 70 && levelPercentages.B1 >= 80) {
      recommendedLevel = 'B2';
    } else if (levelPercentages.B1 >= 70 && levelPercentages.A2 >= 80) {
      recommendedLevel = 'B1';
    } else if (levelPercentages.A2 >= 70 && levelPercentages.A1 >= 80) {
      recommendedLevel = 'A2';
    } else {
      recommendedLevel = 'A1';
    }

    // Adjust for skill gaps
    const hasSignificantGaps = Object.values(skillPercentages).some(score => score < 40);
    if (hasSignificantGaps && recommendedLevel !== 'A1') {
      const levels: ('A1' | 'A2' | 'B1' | 'B2')[] = ['A1', 'A2', 'B1', 'B2'];
      const currentIndex = levels.indexOf(recommendedLevel);
      if (currentIndex > 0) {
        recommendedLevel = levels[currentIndex - 1];
      }
    }

    const confidenceScore = Math.round((earnedPoints / totalPoints) * 100);
    
    // Generate recommendations
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const recommendations: string[] = [];

    Object.entries(skillPercentages).forEach(([skill, score]) => {
      if (score >= 75) strengths.push(skill);
      if (score < 50) weaknesses.push(skill);
    });

    if (weaknesses.includes('grammar')) {
      recommendations.push('Focus on grammar fundamentals and verb conjugations');
    }
    if (weaknesses.includes('vocabulary')) {
      recommendations.push('Build core vocabulary through daily practice');
    }
    if (weaknesses.includes('reading')) {
      recommendations.push('Practice reading comprehension with graded texts');
    }

    const levelHours = {
      A1: '2-3 months',
      A2: '3-4 months',
      B1: '4-6 months',
      B2: '6-8 months'
    };

    return {
      recommendedLevel,
      recommendedUnit: levelPercentages[recommendedLevel] >= 85 ? 2 : 1,
      recommendedLesson: 1,
      confidenceScore,
      strengths,
      weaknesses,
      detailedScores: levelPercentages,
      skillBreakdown: skillPercentages,
      recommendations,
      estimatedStudyTime: levelHours[recommendedLevel],
      questionsAnswered: this.questionsAsked.length,
      totalQuestions: PLACEMENT_QUESTIONS.length
    };
  }
}

// Legacy function for backward compatibility
export function calculatePlacementResult(answers: { [questionId: string]: string }): PlacementResult {
  const exam = new AdaptivePlacementExam();
  
  // Simulate the adaptive exam with provided answers
  Object.entries(answers).forEach(([questionId, answer]) => {
    exam.submitAnswer(questionId, answer);
  });
  
  return exam.calculateFinalResult();
}