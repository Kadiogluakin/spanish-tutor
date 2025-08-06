#!/usr/bin/env node

// Fix Akin's level to A2
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAkinLevel() {
  const userId = '919d96bd-a92f-4f83-a45f-d4a7c5a38037';
  
  console.log('🔧 Fixing Akin\'s level from B2 to A2...');
  
  try {
    // Update user level to A2
    const { data: updatedProfile, error: updateError } = await supabase
      .from('user_profiles')
      .update({
        level_cefr: 'A2',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating level:', updateError);
      return;
    }

    console.log('✅ Successfully updated level to A2');
    
    // Show next lesson
    const { data: nextLesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, title, cefr, content_refs')
      .eq('cefr', 'A2')
      .order('content_refs->unit')
      .order('content_refs->lesson');

    if (!lessonError && nextLesson) {
      // Get completed lessons
      const { data: progress } = await supabase
        .from('user_progress')
        .select('lesson_id')
        .eq('user_id', userId);

      const completedIds = new Set(progress?.map(p => p.lesson_id) || []);
      const nextA2Lesson = nextLesson.find(lesson => !completedIds.has(lesson.id));
      
      if (nextA2Lesson) {
        const refs = nextA2Lesson.content_refs || {};
        console.log(`\n🎯 Next lesson: A2 Unit ${refs.unit}.${refs.lesson} - ${nextA2Lesson.title}`);
        console.log(`📚 This should now appear as your "Lesson of the Day"`);
      }
    }

    console.log('\n✅ Fix complete! Refresh your lesson page.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAkinLevel();