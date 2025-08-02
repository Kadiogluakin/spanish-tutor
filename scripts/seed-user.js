const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const dbPath = './local.db';

try {
  const db = new Database(dbPath);
  
  // Insert a test user
  const insertUser = db.prepare(`
    INSERT OR REPLACE INTO user (id, name, level_cefr) 
    VALUES (?, ?, ?)
  `);
  
  insertUser.run('admin@example.com', 'Admin User', 'A1');
  
  console.log('User seeded successfully!');
  console.log('Login credentials:');
  console.log('Email: admin@example.com');
  console.log('Password: spanish123');
  
  db.close();
} catch (error) {
  console.error('User seeding failed:', error);
  process.exit(1);
}