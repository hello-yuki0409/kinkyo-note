CREATE TABLE IF NOT EXISTS `classmates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`nickname` text DEFAULT '' NOT NULL,
	`current_location` text DEFAULT '' NOT NULL,
	`job` text DEFAULT '' NOT NULL,
	`comment` text NOT NULL,
	`sns_url` text DEFAULT '' NOT NULL,
	`visibility` text DEFAULT 'public' NOT NULL,
	`status` text DEFAULT 'published' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `groups_slug_unique` ON `groups` (`slug`);
