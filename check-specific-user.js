#!/usr/bin/env node

// Debug script to check specific user by UID
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser(userId) {
  try {
    console.log('🔍 Checking user:', userId);
    console.log('=====================================\n');

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return;
    }

    console.log('📊 USER PROFILE:');
    console.log('Current Level:', profile?.level_cefr || 'Not set');
    console.log('Placement Completed:', profile?.placement_completed || false);
    console.log('Created:', profile?.created_at);
    console.log('Updated:', profile?.updated_at);
    
    if (profile?.placement_scores) {
      console.log('\n🎯 PLACEMENT EXAM RESULTS:');
      console.log('Overall Confidence:', profile.placement_scores.overall_confidence);
      if (profile.placement_scores.level_scores) {
        console.log('Level Scores:', profile.placement_scores.level_scores);
      }
      if (profile.placement_scores.skill_breakdown) {
        console.log('Skill Breakdown:', profile.placement_scores.skill_breakdown);
      }
      if (profile.placement_scores.strengths) {
        console.log('Strengths:', profile.placement_scores.strengths);
      }
      if (profile.placement_scores.weaknesses) {
        console.log('Weaknesses:', profile.placement_scores.weaknesses);
      }
    }

    // Get user progress
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('lesson_id, completed_at, score, time_spent_min')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (progressError) {
      console.error('❌ Error fetching progress:', progressError);
      return;
    }

    console.log('\n📚 LESSON PROGRESS:');
    console.log('Total Completed Lessons:', progress?.length || 0);

    // Get lesson details for completed lessons
    if (progress && progress.length > 0) {
      const lessonIds = progress.map(p => p.lesson_id);
      
      const { data: lessons, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title, cefr, content_refs')
        .in('id', lessonIds);

      if (!lessonsError && lessons) {
        const lessonMap = new Map(lessons.map(l => [l.id, l]));
        
        console.log('\n📖 RECENT COMPLETED LESSONS:');
        progress.slice(0, 15).forEach((p, index) => {
          const lesson = lessonMap.get(p.lesson_id);
          if (lesson) {
            const contentRefs = lesson.content_refs || {};
            const completedDate = new Date(p.completed_at).toLocaleDateString();
            console.log(`${index + 1}. ${lesson.cefr} Unit ${contentRefs.unit || '?'}.${contentRefs.lesson || '?'}: ${lesson.title} (${completedDate})`);
          }
        });

        // Analyze by level
        const levelCounts = {};
        lessons.forEach(lesson => {
          levelCounts[lesson.cefr] = (levelCounts[lesson.cefr] || 0) + 1;
        });

        console.log('\n📊 LESSONS COMPLETED BY LEVEL:');
        Object.entries(levelCounts).sort().forEach(([level, count]) => {
          console.log(`  ${level}: ${count} lessons`);
        });

        // Find highest unit/lesson completed for each level
        ['A1', 'A2', 'B1', 'B2'].forEach(level => {
          const levelLessons = lessons.filter(l => l.cefr === level);
          if (levelLessons.length > 0) {
            const maxLesson = levelLessons.reduce((max, lesson) => {
              const refs = lesson.content_refs || {};
              const unit = refs.unit || 1;
              const lessonNum = refs.lesson || 1;
              
              if (unit > max.unit || (unit === max.unit && lessonNum > max.lesson)) {
                return { unit, lesson: lessonNum, title: lesson.title };
              }
              return max;
            }, { unit: 0, lesson: 0, title: '' });

            console.log(`🎯 HIGHEST ${level} COMPLETED: Unit ${maxLesson.unit}.${maxLesson.lesson} - ${maxLesson.title}`);
          }
        });
      }
    }

    // Get all available lessons to see what should be next
    console.log('\n🔮 NEXT LESSON ANALYSIS:');
    
    const { data: allLessons, error: allLessonsError } = await supabase
      .from('lessons')
      .select('id, title, cefr, content_refs')
      .order('cefr')
      .order('content_refs->unit')
      .order('content_refs->lesson');

    if (!allLessonsError && allLessons) {
      const completedIds = new Set(progress?.map(p => p.lesson_id) || []);
      
      // Find next lesson for each level
      ['A1', 'A2', 'B1', 'B2'].forEach(level => {
        const nextLesson = allLessons.find(lesson => {
          return lesson.cefr === level && !completedIds.has(lesson.id);
        });

        if (nextLesson) {
          const refs = nextLesson.content_refs || {};
          const isCurrentLevel = profile?.level_cefr === level;
          const marker = isCurrentLevel ? '👉 CURRENT LEVEL' : '';
          console.log(`Next ${level}: Unit ${refs.unit || '?'}.${refs.lesson || '?'} - ${nextLesson.title} ${marker}`);
        } else {
          const isCurrentLevel = profile?.level_cefr === level;
          const marker = isCurrentLevel ? '👉 CURRENT LEVEL (ALL DONE!)' : '';
          console.log(`Next ${level}: All lessons completed ${marker}`);
        }
      });
    }

    // Get learning sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!sessionsError && sessions && sessions.length > 0) {
      console.log('\n📅 RECENT LEARNING SESSIONS:');
      sessions.forEach((session, index) => {
        const date = new Date(session.created_at).toLocaleDateString();
        console.log(`${index + 1}. ${date}: ${session.duration_min || 0} min - ${session.summary || 'No summary'}`);
      });
    }

    console.log('\n🔧 DIAGNOSIS:');
    if (profile?.level_cefr === 'B2' && progress && progress.length < 50) {
      console.log('❌ ISSUE FOUND: Your level is set to B2 but you have relatively few completed lessons');
      console.log('   This suggests either:');
      console.log('   1. Placement exam set you too high');
      console.log('   2. System auto-advanced you incorrectly');
      console.log('   3. Data inconsistency');
      
      // Find what A2 lesson you should be on
      const a2Lessons = allLessons?.filter(l => l.cefr === 'A2') || [];
      const completedA2 = new Set();
      
      if (progress && progress.length > 0) {
        const lessonIds = progress.map(p => p.lesson_id);
        const { data: completedLessons } = await supabase
          .from('lessons')
          .select('id, cefr')
          .in('id', lessonIds);
        
        if (completedLessons) {
          completedLessons.filter(l => l.cefr === 'A2').forEach(l => completedA2.add(l.id));
        }
      }
      
      const nextA2 = a2Lessons.find(l => !completedA2.has(l.id));
      if (nextA2) {
        const refs = nextA2.content_refs || {};
        console.log(`\n💡 RECOMMENDATION: Reset level to A2, continue with Unit ${refs.unit}.${refs.lesson}`);
      }
    } else {
      console.log('✅ Level and progress appear consistent');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

const userId = '919d96bd-a92f-4f83-a45f-d4a7c5a38037';
checkUser(userId);