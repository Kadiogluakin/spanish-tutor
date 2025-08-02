CREATE TABLE `error_log` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text,
	`type` text,
	`spanish` text,
	`english` text,
	`note` text,
	`count` integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `homework` (
	`id` text PRIMARY KEY NOT NULL,
	`assigned_at` integer DEFAULT (unixepoch('now')*1000),
	`due_at` integer,
	`type` text,
	`prompt` text,
	`rubric_json` text
);
--> statement-breakpoint
CREATE TABLE `lesson` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`cefr` text NOT NULL,
	`objectives` text,
	`content_refs` text
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`date` integer DEFAULT (unixepoch('now')*1000),
	`lesson_id` text,
	`duration_min` integer DEFAULT 0,
	`summary` text,
	`audio_url` text,
	`board_snapshot_url` text
);
--> statement-breakpoint
CREATE TABLE `skill_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`skill_code` text,
	`sm2_easiness` real DEFAULT 2.5,
	`interval_days` integer DEFAULT 0,
	`next_due` integer,
	`successes` integer DEFAULT 0,
	`failures` integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE `submission` (
	`id` text PRIMARY KEY NOT NULL,
	`homework_id` text,
	`text_content` text,
	`audio_url` text,
	`transcript` text,
	`graded_at` integer,
	`grade_json` text,
	`teacher_feedback` text
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`level_cefr` text DEFAULT 'B1'
);
--> statement-breakpoint
CREATE TABLE `vocab` (
	`id` text PRIMARY KEY NOT NULL,
	`spanish` text NOT NULL,
	`english` text NOT NULL,
	`tags` text
);
--> statement-breakpoint
CREATE TABLE `vocab_progress` (
	`id` text PRIMARY KEY NOT NULL,
	`vocab_id` text,
	`sm2_easiness` real DEFAULT 2.5,
	`interval_days` integer DEFAULT 0,
	`next_due` integer,
	`successes` integer DEFAULT 0,
	`failures` integer DEFAULT 0
);
