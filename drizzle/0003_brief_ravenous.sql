CREATE TABLE `certification_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`record_type` text DEFAULT 'certification' NOT NULL,
	`issuer_name` text NOT NULL,
	`issuer_type` text,
	`scope` text,
	`issue_date` text,
	`expiry_date` text,
	`linked_metric_id` integer,
	`linked_hypothesis_id` integer,
	`document_note` text,
	`notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_hypothesis_id`) REFERENCES `impact_hypotheses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `observation_quality_checks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`observation_id` integer NOT NULL,
	`rule` text NOT NULL,
	`passed` integer NOT NULL,
	`detail` text,
	FOREIGN KEY (`observation_id`) REFERENCES `metric_observations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `use_cases` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`origin` text DEFAULT 'other' NOT NULL,
	`sector` text,
	`topic` text,
	`stage` text DEFAULT 'interest' NOT NULL,
	`linked_hypothesis_id` integer,
	`narrative_text` text NOT NULL,
	`verification_status` text DEFAULT 'unverified' NOT NULL,
	`verified_by` text,
	`verified_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_hypothesis_id`) REFERENCES `impact_hypotheses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `verification_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`record_type` text NOT NULL,
	`record_id` integer NOT NULL,
	`flags` text,
	`confidence_score` real,
	`reviewer_decision` text,
	`reviewer_notes` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `metric_observations` ADD `jurisdiction_id` integer REFERENCES jurisdictions(id);--> statement-breakpoint
ALTER TABLE `metric_observations` ADD `source_type` text DEFAULT 'direct_entry' NOT NULL;--> statement-breakpoint
ALTER TABLE `metric_observations` ADD `submitted_by` text;--> statement-breakpoint
ALTER TABLE `metric_observations` ADD `status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `metric_observations` ADD `evidence_text` text;