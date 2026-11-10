CREATE TABLE `jurisdiction_baselines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_id` integer NOT NULL,
	`jurisdiction_id` integer NOT NULL,
	`baseline_value` real NOT NULL,
	`baseline_date` text,
	`baseline_source` text,
	`confidence_level` text,
	`notes` text,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`jurisdiction_id`) REFERENCES `jurisdictions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `jurisdictions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`name` text NOT NULL,
	`level` text DEFAULT 'subnational' NOT NULL,
	`parent_jurisdiction_id` integer,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metric_capital_provider_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`metric_id` integer NOT NULL,
	`tag` text NOT NULL,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `metric_targets` ADD `jurisdiction_id` integer REFERENCES jurisdictions(id);--> statement-breakpoint
ALTER TABLE `metric_targets` ADD `milestone_date` text;--> statement-breakpoint
ALTER TABLE `metric_targets` ADD `target_date` text;--> statement-breakpoint
ALTER TABLE `metric_targets` ADD `rationale` text;--> statement-breakpoint
ALTER TABLE `metrics` ADD `definition_methods_source` text;--> statement-breakpoint
ALTER TABLE `metrics` ADD `calculation_method` text;--> statement-breakpoint
ALTER TABLE `metrics` ADD `suggested_frequency` text;--> statement-breakpoint
ALTER TABLE `metrics` ADD `disaggregation_dimensions` text;--> statement-breakpoint
ALTER TABLE `metrics` ADD `justification` text;--> statement-breakpoint
ALTER TABLE `metrics` ADD `aggregation_method` text DEFAULT 'sum' NOT NULL;