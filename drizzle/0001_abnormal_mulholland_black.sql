ALTER TABLE `error_log` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `session` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `vocab_progress` ADD `user_id` text;