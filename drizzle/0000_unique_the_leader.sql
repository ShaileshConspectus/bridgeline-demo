CREATE TABLE `assumption_risks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hypothesis_id` integer NOT NULL,
	`description` text NOT NULL,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `impact_hypotheses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `climate_theses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`version` integer NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`statement` text NOT NULL,
	`problem` text,
	`target_population` text,
	`geography` text,
	`expected_change` text,
	`time_horizon` text,
	`change_note` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `commercial_value_chain_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thesis_id` integer NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`thesis_id`) REFERENCES `climate_theses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `engagement_funnel_stages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thesis_id` integer NOT NULL,
	`stage` text NOT NULL,
	`threshold_definition` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`thesis_id`) REFERENCES `climate_theses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `funding_instruments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`capital_provider_name` text NOT NULL,
	`instrument_type` text NOT NULL,
	`amount` real,
	`currency` text DEFAULT 'USD',
	`start_date` text,
	`end_date` text,
	`reporting_requirement` text,
	`covenant_or_milestone_terms` text,
	`renewal_or_tranche_trigger` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `hypothesis_metric_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`hypothesis_id` integer NOT NULL,
	`metric_id` integer NOT NULL,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `impact_hypotheses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `impact_hypotheses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thesis_id` integer NOT NULL,
	`statement` text NOT NULL,
	`from_rung_id` integer,
	`to_rung_id` integer,
	`status` text DEFAULT 'untested' NOT NULL,
	`confidence_note` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`thesis_id`) REFERENCES `climate_theses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_rung_id`) REFERENCES `toc_rungs`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_rung_id`) REFERENCES `toc_rungs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`source` text DEFAULT 'bespoke' NOT NULL,
	`source_code` text,
	`toc_location` text,
	`unit` text,
	`direction_of_good` text,
	`requires_elevated_verification` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `objective_output_activities` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thesis_id` integer NOT NULL,
	`parent_id` integer,
	`kind` text NOT NULL,
	`code` text,
	`title` text NOT NULL,
	`description` text,
	`linked_toc_rung_id` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`thesis_id`) REFERENCES `climate_theses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_toc_rung_id`) REFERENCES `toc_rungs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`org_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`engagement_funnel_enabled` integer DEFAULT false NOT NULL,
	`commercial_value_chain_enabled` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`org_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `toc_rungs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thesis_id` integer NOT NULL,
	`rung_type` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`year_horizon` text,
	`is_core` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`thesis_id`) REFERENCES `climate_theses`(`id`) ON UPDATE no action ON DELETE no action
);
