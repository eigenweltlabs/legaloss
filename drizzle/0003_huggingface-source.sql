ALTER TABLE `project_stats` ADD `downloads` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `source` text DEFAULT 'github' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `source_type` text;