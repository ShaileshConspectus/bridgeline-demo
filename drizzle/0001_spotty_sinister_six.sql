CREATE TABLE `metric_observations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_id` integer NOT NULL,
	`period` text NOT NULL,
	`actual_value` real NOT NULL,
	`note` text,
	`recorded_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metric_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_id` integer NOT NULL,
	`period` text NOT NULL,
	`baseline` real,
	`milestone` real,
	`target` real,
	`consequence_severity` text,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE no action
);
