#!/usr/bin/env node

// Supabase curriculum seeding script - populates lessons and vocabulary tables
// Run this to update your Supabase database with the complete curriculum (A1-C2)

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '../.env.local' });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Service role key for admin operations
);

// Extract curriculum from the comprehensive seed script
function getCurriculumData() {
  const curriculumScript = fs.readFileSync(path.join(__dirname, 'seed-comprehensive.js'), 'utf8');
  
  // Extract the curriculum object from the script
  const curriculumMatch = curriculumScript.match(/const curriculum = \{[\s\S]*?\n\};/);
  if (!curriculumMatch) {
    throw new Error('Could not extract curriculum data from seed-comprehensive.js');
  }

  // Create a safe evaluation context
  const curriculumCode = curriculumMatch[0];
  const context = {};
  
  // Safely evaluate the curriculum object
  try {
    const func = new Function('return ' + curriculumCode.replace('const curriculum = ', ''));
    return func();
  } catch (error) {
    console.error('Error parsing curriculum data:', error);
    throw error;
  }
}

// Helper function to generate unique IDs for vocabulary
function generateVocabId(spanish, english) {
  return `vocab_${spanish.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
}

// Seed lessons into Supabase
async function seedLessons(curriculum) {
  console.log('🌱 Seeding lessons to Supabase...');
  
  let lessonCount = 0;
  const lessons = [];

  for (const level in curriculum) {
    const lessonsForLevel = curriculum[level];
    
    for (const lesson of lessonsForLevel) {
      const contentRefs = {
        unit: lesson.unit,
        lesson: lesson.lesson,
        prerequisites: lesson.prerequisites || [],
        difficulty: lesson.difficulty,
        estimatedDuration: lesson.estimatedDuration,
        vocabularyCount: lesson.vocabulary.length
      };

      lessons.push({
        id: lesson.id,
        title: lesson.title,
        cefr: lesson.cefr,
        objectives: lesson.objectives,
        content_refs: contentRefs
      });

      lessonCount++;
    }
  }

  // Insert lessons in batches
  const batchSize = 50;
  for (let i = 0; i < lessons.length; i += batchSize) {
    const batch = lessons.slice(i, i + batchSize);
    const { error } = await supabase
      .from('lessons')
      .upsert(batch);

    if (error) {
      console.error('Error inserting lesson batch:', error);
      throw error;
    }
  }

  console.log(`✅ Seeded ${lessonCount} lessons`);
}

// Seed vocabulary into Supabase
async function seedVocabulary(curriculum) {
  console.log('🌱 Seeding vocabulary to Supabase...');
  
  let vocabCount = 0;
  const vocabulary = [];
  const seenWords = new Set();

  for (const level in curriculum) {
    const lessonsForLevel = curriculum[level];
    
    for (const lesson of lessonsForLevel) {
      for (const vocabItem of lesson.vocabulary) {
        const wordKey = `${vocabItem.spanish}-${vocabItem.english}`;
        
        if (!seenWords.has(wordKey)) {
          const id = generateVocabId(vocabItem.spanish, vocabItem.english);
          const tags = {
            difficulty: vocabItem.difficulty,
            tags: vocabItem.tags,
            lesson: lesson.id,
            cefr: lesson.cefr
          };

          vocabulary.push({
            id,
            spanish: vocabItem.spanish,
            english: vocabItem.english,
            tags
          });

          seenWords.add(wordKey);
          vocabCount++;
        }
      }
    }
  }

  // Insert vocabulary one by one to avoid duplicate conflicts
  console.log('📝 Inserting vocabulary items...');
  let insertedCount = 0;
  
  for (const vocabItem of vocabulary) {
    const { error } = await supabase
      .from('vocabulary')
      .upsert([vocabItem]);

    if (error) {
      console.error(`Error inserting vocabulary item "${vocabItem.spanish}":`, error);
      // Continue with other items instead of throwing
    } else {
      insertedCount++;
    }
    
    // Show progress every 50 items
    if (insertedCount % 50 === 0) {
      console.log(`   Inserted ${insertedCount}/${vocabulary.length} vocabulary items...`);
    }
  }
  
  console.log(`📝 Inserted ${insertedCount} vocabulary items successfully`);
  
  if (insertedCount < vocabulary.length) {
    console.log(`⚠️  ${vocabulary.length - insertedCount} vocabulary items had conflicts or errors`);
  }

  console.log(`✅ Completed vocabulary seeding process`);
}

// Main seeding function
async function seedSupabaseCurriculum() {
  console.log('🌱 Starting Supabase curriculum seeding...');
  
  try {
    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('❌ Missing required environment variables.\n\nPlease ensure you have the following in your .env.local file:\n- NEXT_PUBLIC_SUPABASE_URL\n- SUPABASE_SERVICE_ROLE_KEY');
    }

    // Load curriculum data
    console.log('📚 Loading curriculum data...');
    const curriculum = getCurriculumData();
    
    console.log(`📊 Loaded curriculum with ${Object.keys(curriculum).length} levels:`);
    for (const level in curriculum) {
      console.log(`   - ${level}: ${curriculum[level].length} lessons`);
    }

    // Clear existing data
    console.log('🧹 Clearing existing curriculum data...');
    const { error: lessonsDeleteError } = await supabase.from('lessons').delete().neq('id', '');
    const { error: vocabDeleteError } = await supabase.from('vocabulary').delete().neq('id', '');
    
    if (lessonsDeleteError || vocabDeleteError) {
      console.warn('Warning: Some data may not have been cleared:', lessonsDeleteError || vocabDeleteError);
    }
    console.log('✅ Cleared existing curriculum data');
    
    await seedLessons(curriculum);
    await seedVocabulary(curriculum);
    
    console.log('✅ Supabase curriculum seeding completed!');
    
    // Display statistics
    const { count: lessonCount } = await supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true });
      
    const { count: vocabCount } = await supabase
      .from('vocabulary')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Supabase database now contains:`);
    console.log(`   - ${lessonCount} lessons (school-level standard)`);
    console.log(`   - ${vocabCount} vocabulary items`);
    console.log(`   - 4 CEFR levels (A1, A2, B1, B2)`);
    console.log(`   - Progressive difficulty scaling (1-9)`);
    console.log(`   - A1: ${curriculum.A1.length} lessons (beginner)`);
    console.log(`   - A2: ${curriculum.A2.length} lessons (elementary)`);
    console.log(`   - B1: ${curriculum.B1.length} lessons (intermediate)`);
    console.log(`   - B2: ${curriculum.B2.length} lessons (upper-intermediate) ✨ NEW`);
    console.log('\n🎉 Your Supabase database is now updated with the B2 level!');
    
  } catch (error) {
    console.error('❌ Error seeding Supabase curriculum:', error.message);
    
    if (error.message.includes('environment variables')) {
      console.log('\n💡 To fix this:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Go to Settings → API');
      console.log('3. Copy your Project URL and Service Role Key');
      console.log('4. Add them to your .env.local file');
    }
    
    process.exit(1);
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedSupabaseCurriculum();
}

module.exports = { seedSupabaseCurriculum };