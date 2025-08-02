// Types for the curriculum system

export interface VocabularyItem {
  spanish: string;
  english: string;
  difficulty: number; // 1-5 scale
  tags: string[];
}

export interface GrammarPoint {
  topic: string;
  explanation: string;
  examples: string[];
}

export interface LessonObjective {
  type: 'vocabulary' | 'grammar' | 'speaking' | 'listening' | 'cultural';
  description: string;
  targetWords?: string[]; // specific vocab to focus on
}

export interface LessonContent {
  id: string;
  title: string;
  cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  unit: number;
  lesson: number;
  objectives: LessonObjective[];
  vocabulary: VocabularyItem[];
  grammar: GrammarPoint[];
  culturalNotes?: string[];
  estimatedDuration: number; // minutes
  prerequisites?: string[]; // lesson IDs
  difficulty: number; // 1-10 scale
}

export interface CurriculumUnit {
  id: string;
  title: string;
  cefr: string;
  description: string;
  lessons: LessonContent[];
}

export interface UserProgress {
  userId: string;
  currentLevel: string;
  completedLessons: string[];
  lastLessonDate?: Date;
  consecutiveDays: number;
  strengths: string[];
  weaknesses: string[];
}