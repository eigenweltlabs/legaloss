ALTER TABLE `projects` ADD `maintainer_note` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `featured` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `featured_at` integer;--> statement-breakpoint
ALTER TABLE `projects` ADD `featured_announced_at` integer;--> statement-breakpoint
CREATE INDEX `projects_featured_idx` ON `projects` (`featured`);