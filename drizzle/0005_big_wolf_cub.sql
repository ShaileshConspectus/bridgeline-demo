CREATE TABLE `learning_agenda_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`project_id` integer NOT NULL,
	`title` text NOT NULL,
	`question` text,
	`priority` text DEFAULT 'moderate' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`linked_hypothesis_id` integer,
	`linked_metric_id` integer,
	`linked_funding_instrument_id` integer,
	`due_date` text,
	`resolution_note` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_hypothesis_id`) REFERENCES `impact_hypotheses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_metric_id`) REFERENCES `metrics`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_funding_instrument_id`) REFERENCES `funding_instruments`(`id`) ON UPDATE no action ON DELETE no action
);
