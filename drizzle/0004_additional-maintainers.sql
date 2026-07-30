CREATE TABLE `project_maintainers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`github_login` text NOT NULL,
	`added_by_id` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`added_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `project_maintainers_project_login_unique` ON `project_maintainers` (`project_id`,`github_login`);--> statement-breakpoint
CREATE INDEX `project_maintainers_login_idx` ON `project_maintainers` (`github_login`);