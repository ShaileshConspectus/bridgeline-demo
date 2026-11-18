CREATE TABLE `evaluation_assessments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`hypothesis_id` integer,
	`title` text NOT NULL,
	`timing` text NOT NULL,
	`allocation` text NOT NULL,
	`comparison_data` text NOT NULL,
	`num_units` integer,
	`high_stakes` integer DEFAULT false NOT NULL,
	`innovative` integer DEFAULT false NOT NULL,
	`replicable` integer DEFAULT false NOT NULL,
	`untested` integer DEFAULT false NOT NULL,
	`influential` integer DEFAULT false NOT NULL,
	`recommended_method` text NOT NULL,
	`screen_verdict` text NOT NULL,
	`rationale` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hypothesis_id`) REFERENCES `impact_hypotheses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `evidence_studies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`linked_hypothesis_id` integer,
	`title` text NOT NULL,
	`citation` text,
	`design` text NOT NULL,
	`study_scope` text DEFAULT 'unknown' NOT NULL,
	`summary` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_hypothesis_id`) REFERENCES `impact_hypotheses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `impact_hypotheses` ADD `counterfactual` text;--> statement-breakpoint
ALTER TABLE `impact_hypotheses` ADD `comparison_approach` text;--> statement-breakpoint
ALTER TABLE `impact_hypotheses` ADD `claim_type` text DEFAULT 'contribution' NOT NULL;--> statement-breakpoint
ALTER TABLE `metrics` ADD `indicator_purpose` text;