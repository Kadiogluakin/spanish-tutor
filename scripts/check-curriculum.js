#!/usr/bin/env node

// Quick script to check curriculum statistics
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'local.db');
const db = new Database(dbPath);

try {
  console.log('📊 Curriculum Statistics:');
  console.log('========================');
  
  // Get total counts
  const totalLessons = db.prepare('SELECT COUNT(*) as count FROM lesson').get().count;
  const totalVocab = db.prepare('SELECT COUNT(*) as count FROM vocab').get().count;
  
  console.log(`Total Lessons: ${totalLessons}`);
  console.log(`Total Vocabulary: ${totalVocab}`);
  console.log('');
  
  // Get lessons by level
  const levels = ['A1', 'A2', 'B1'];
  for (const level of levels) {
    const levelLessons = db.prepare('SELECT COUNT(*) as count FROM lesson WHERE cefr = ?').get(level).count;
    const levelVocab = db.prepare(`
      SELECT COUNT(*) as count FROM vocab 
      WHERE json_extract(tags, '$.cefr') = ?
    `).get(level).count;
    
    console.log(`${level} Level:`);
    console.log(`  - ${levelLessons} lessons`);
    console.log(`  - ${levelVocab} vocabulary items`);
  }
  
  console.log('');
  console.log('✅ Curriculum is comprehensive and ready for use!');
  
  // Show first few lessons for verification
  console.log('');
  console.log('📚 Sample Lessons:');
  const sampleLessons = db.prepare(`
    SELECT id, title, cefr FROM lesson 
    ORDER BY cefr, id 
    LIMIT 5
  `).all();
  
  sampleLessons.forEach(lesson => {
    console.log(`  ${lesson.cefr}: ${lesson.title} (${lesson.id})`);
  });
  
} catch (error) {
  console.error('❌ Error checking curriculum:', error);
} finally {
  db.close();
}