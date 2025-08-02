import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name'),
  level_cefr: text('level_cefr').default('B1'),
});

export const lesson = sqliteTable('lesson', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  cefr: text('cefr').notNull(),
  objectives: text('objectives'), // JSON string
  contentRefs: text('content_refs'), // JSON string
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  date: integer('date', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now')*1000)`),
  lessonId: text('lesson_id'),
  durationMin: integer('duration_min').default(0),
  summary: text('summary'),
  audioUrl: text('audio_url'),
  boardSnapshotUrl: text('board_snapshot_url'),
});

export const skillProgress = sqliteTable('skill_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  skillCode: text('skill_code'),
  sm2Easiness: real('sm2_easiness').default(2.5),
  intervalDays: integer('interval_days').default(0),
  nextDue: integer('next_due', { mode: 'timestamp_ms' }),
  successes: integer('successes').default(0),
  failures: integer('failures').default(0),
});

export const errorLog = sqliteTable('error_log', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  sessionId: text('session_id'),
  type: text('type'), // grammar|vocab|pron
  spanish: text('spanish'),
  english: text('english'),
  note: text('note'),
  count: integer('count').default(1),
});

export const vocab = sqliteTable('vocab', {
  id: text('id').primaryKey(),
  spanish: text('spanish').notNull(),
  english: text('english').notNull(),
  tags: text('tags'), // JSON
});

export const vocabProgress = sqliteTable('vocab_progress', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  vocabId: text('vocab_id'),
  sm2Easiness: real('sm2_easiness').default(2.5),
  intervalDays: integer('interval_days').default(0),
  nextDue: integer('next_due', { mode: 'timestamp_ms' }),
  successes: integer('successes').default(0),
  failures: integer('failures').default(0),
});

export const homework = sqliteTable('homework', {
  id: text('id').primaryKey(),
  assignedAt: integer('assigned_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now')*1000)`),
  dueAt: integer('due_at', { mode: 'timestamp_ms' }),
  type: text('type'),
  prompt: text('prompt'),
  rubricJson: text('rubric_json'),
});

export const submission = sqliteTable('submission', {
  id: text('id').primaryKey(),
  homeworkId: text('homework_id'),
  textContent: text('text_content'),
  audioUrl: text('audio_url'),
  transcript: text('transcript'),
  gradedAt: integer('graded_at', { mode: 'timestamp_ms' }),
  gradeJson: text('grade_json'),
  teacherFeedback: text('teacher_feedback'),
});
