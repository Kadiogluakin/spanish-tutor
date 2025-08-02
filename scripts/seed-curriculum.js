#!/usr/bin/env node

// Curriculum seeding script - populates lesson and vocab tables from curriculum files

const Database = require('better-sqlite3');
const path = require('path');

// Initialize database connection
const dbPath = path.join(__dirname, '..', 'local.db');
const db = new Database(dbPath);

// Import curriculum data from the new structure
const { curriculum } = require('../src/lib/curriculum');

const curriculumData = curriculum;

// Helper function to generate unique IDs for vocabulary
function generateVocabId(spanish, english) {
  return `vocab_${spanish.toLowerCase().replace(/\s+/g, '_')}`;
}

// Seed lessons
function seedLessons() {
  console.log('Seeding lessons...');
  
  const insertLesson = db.prepare(`
    INSERT OR REPLACE INTO lesson (id, title, cefr, objectives, content_refs)
    VALUES (?, ?, ?, ?, ?)
  `);

  let lessonCount = 0;

  for (const level in curriculumData) {
    const units = curriculumData[level];
    
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        const objectives = JSON.stringify(lesson.objectives);
        const contentRefs = JSON.stringify({
          unit: lesson.unit,
          lesson: lesson.lesson,
          prerequisites: lesson.prerequisites || [],
          difficulty: lesson.difficulty,
          estimatedDuration: lesson.estimatedDuration,
          vocabularyCount: lesson.vocabulary.length
        });

        insertLesson.run(
          lesson.id,
          lesson.title,
          lesson.cefr,
          objectives,
          contentRefs
        );

        lessonCount++;
      }
    }
  }

  console.log(`✅ Seeded ${lessonCount} lessons`);
}

// Seed vocabulary
function seedVocabulary() {
  console.log('Seeding vocabulary...');
  
  const insertVocab = db.prepare(`
    INSERT OR REPLACE INTO vocab (id, spanish, english, tags)
    VALUES (?, ?, ?, ?)
  `);

  let vocabCount = 0;
  const seenWords = new Set(); // Prevent duplicates

  for (const level in curriculumData) {
    const units = curriculumData[level];
    
    for (const unit of units) {
      for (const lesson of unit.lessons) {
        for (const vocabItem of lesson.vocabulary) {
          const wordKey = `${vocabItem.spanish}-${vocabItem.english}`;
          
          if (!seenWords.has(wordKey)) {
            const id = generateVocabId(vocabItem.spanish, vocabItem.english);
            const tags = JSON.stringify({
              difficulty: vocabItem.difficulty,
              tags: vocabItem.tags,
              lesson: lesson.id,
              cefr: lesson.cefr
            });

            insertVocab.run(
              id,
              vocabItem.spanish,
              vocabItem.english,
              tags
            );

            seenWords.add(wordKey);
            vocabCount++;
          }
        }
      }
    }
  }

  console.log(`✅ Seeded ${vocabCount} vocabulary items`);
}

// Main seeding function
function seedCurriculum() {
  console.log('🌱 Starting curriculum seeding...');
  
  try {
    // Begin transaction for atomic operation
    db.exec('BEGIN TRANSACTION');
    
    seedLessons();
    seedVocabulary();
    
    // Commit transaction
    db.exec('COMMIT');
    
    console.log('✅ Curriculum seeding completed successfully!');
    
    // Display statistics
    const lessonCount = db.prepare('SELECT COUNT(*) as count FROM lesson').get().count;
    const vocabCount = db.prepare('SELECT COUNT(*) as count FROM vocab').get().count;
    
    console.log(`📊 Database now contains:`);
    console.log(`   - ${lessonCount} lessons`);
    console.log(`   - ${vocabCount} vocabulary items`);
    
  } catch (error) {
    // Rollback on error
    db.exec('ROLLBACK');
    console.error('❌ Error seeding curriculum:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the seeding if this script is executed directly
if (require.main === module) {
  seedCurriculum();
}

module.exports = { seedCurriculum };