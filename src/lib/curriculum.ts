// Curriculum interface - reads from database
import { createClient } from '@/lib/supabase/server';

export interface LessonContent {
  id: string;
  title: string;
  cefr: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  unit: number;
  lesson: number;
  objectives: string[];
  difficulty: number;
  estimatedDuration: number;
  prerequisites?: string[];
}

export interface VocabularyItem {
  id: string;
  spanish: string;
  english: string;
  difficulty: number;
  tags: string[];
  lesson: string;
  cefr: string;
}

/**
 * Get lessons for a specific CEFR level
 */
export async function getLessonsForLevel(cefrLevel: string): Promise<LessonContent[]> {
  try {
    const supabase = await createClient();
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('cefr', cefrLevel);
    
    if (error) {
      console.error('Error getting lessons for level:', error);
      return [];
    }
    
    return lessons.map(l => {
      const contentRefs = l.content_refs || {};
      const objectives = l.objectives || [];
      
      return {
        id: l.id,
        title: l.title,
        cefr: l.cefr as any,
        unit: contentRefs.unit || 1,
        lesson: contentRefs.lesson || 1,
        objectives,
        difficulty: contentRefs.difficulty || 1,
        estimatedDuration: contentRefs.estimatedDuration || 30,
        prerequisites: contentRefs.prerequisites || []
      };
    }).sort((a, b) => {
      if (a.unit !== b.unit) return a.unit - b.unit;
      return a.lesson - b.lesson;
    });
  } catch (error) {
    console.error('Error getting lessons for level:', error);
    return [];
  }
}

/**
 * Get a specific lesson by ID
 */
export async function getLessonById(lessonId: string): Promise<LessonContent | null> {
  try {
    const supabase = await createClient();
    const { data: lessonData, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();
    
    if (error || !lessonData) return null;
    
    const contentRefs = lessonData.content_refs || {};
    const objectives = lessonData.objectives || [];
    
    return {
      id: lessonData.id,
      title: lessonData.title,
      cefr: lessonData.cefr as any,
      unit: contentRefs.unit || 1,
      lesson: contentRefs.lesson || 1,
      objectives,
      difficulty: contentRefs.difficulty || 1,
      estimatedDuration: contentRefs.estimatedDuration || 30,
      prerequisites: contentRefs.prerequisites || []
    };
  } catch (error) {
    console.error('Error getting lesson by ID:', error);
    return null;
  }
}

/**
 * Get the next lesson in sequence
 */
export async function getNextLesson(currentLessonId: string): Promise<LessonContent | null> {
  try {
    const currentLesson = await getLessonById(currentLessonId);
    if (!currentLesson) return null;
    
    const allLessons = await getLessonsForLevel(currentLesson.cefr);
    const currentIndex = allLessons.findIndex(l => l.id === currentLessonId);
    
    if (currentIndex >= 0 && currentIndex < allLessons.length - 1) {
      return allLessons[currentIndex + 1];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting next lesson:', error);
    return null;
  }
}

/**
 * Get vocabulary for a specific lesson
 */
export async function getVocabularyForLesson(lessonId: string): Promise<VocabularyItem[]> {
  try {
    const supabase = await createClient();
    const { data: vocabItems, error } = await supabase
      .from('vocabulary')
      .select('*');
    
    if (error || !vocabItems) {
      console.error('Error getting vocabulary for lesson:', error);
      return [];
    }
    
    return vocabItems
      .filter(v => {
        if (!v.tags) return false;
        try {
          const tags = v.tags;
          return tags.lesson === lessonId;
        } catch {
          return false;
        }
      })
      .map(v => {
        const tags = v.tags || {};
        return {
          id: v.id,
          spanish: v.spanish,
          english: v.english,
          difficulty: tags.difficulty || 1,
          tags: tags.tags || [],
          lesson: tags.lesson || '',
          cefr: tags.cefr || ''
        };
      });
  } catch (error) {
    console.error('Error getting vocabulary for lesson:', error);
    return [];
  }
}

/**
 * Get all vocabulary items
 */
export async function getAllVocabulary(): Promise<VocabularyItem[]> {
  try {
    const supabase = await createClient();
    const { data: vocabItems, error } = await supabase
      .from('vocabulary')
      .select('*');
    
    if (error || !vocabItems) {
      console.error('Error getting all vocabulary:', error);
      return [];
    }
    
    return vocabItems.map(v => {
      const tags = v.tags || {};
      return {
        id: v.id,
        spanish: v.spanish,
        english: v.english,
        difficulty: tags.difficulty || 1,
        tags: tags.tags || [],
        lesson: tags.lesson || '',
        cefr: tags.cefr || ''
      };
    });
  } catch (error) {
    console.error('Error getting all vocabulary:', error);
    return [];
  }
}

/**
 * Get curriculum statistics
 */
export async function getCurriculumStats() {
  try {
    const supabase = await createClient();
    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact' });
    
    const { data: vocabulary, error: vocabError } = await supabase
      .from('vocabulary')
      .select('id', { count: 'exact' });
    
    if (lessonsError || vocabError) {
      console.error('Error getting curriculum stats:', lessonsError || vocabError);
      return {
        totalLessons: 0,
        totalVocab: 0,
        lessonsByLevel: { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 },
        isComprehensive: false
      };
    }
    
    const totalLessons = lessons?.length || 0;
    const totalVocab = vocabulary?.length || 0;
    
    const a1Lessons = await getLessonsForLevel('A1');
    const a2Lessons = await getLessonsForLevel('A2');
    const b1Lessons = await getLessonsForLevel('B1');
    const b2Lessons = await getLessonsForLevel('B2');
    
          const lessonsByLevel = {
        A1: a1Lessons.length,
        A2: a2Lessons.length,
        B1: b1Lessons.length,
        B2: b2Lessons.length,
        C1: 0, // TODO: Add C1 lessons in future
        C2: 0  // TODO: Add C2 lessons in future
      };
    
    return {
      totalLessons,
      totalVocab,
      lessonsByLevel,
      isComprehensive: totalLessons >= 25 && totalVocab >= 200
    };
  } catch (error) {
    console.error('Error getting curriculum stats:', error);
    return {
      totalLessons: 0,
      totalVocab: 0,
      lessonsByLevel: { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 },
      isComprehensive: false
    };
  }
}