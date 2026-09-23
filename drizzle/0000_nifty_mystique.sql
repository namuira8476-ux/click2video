CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`key` text NOT NULL,
	`mime` text NOT NULL,
	`bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`duration_sec` real,
	`original_name` text NOT NULL,
	`fal_url` text,
	`fal_url_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`template_id` text NOT NULL,
	`status` text NOT NULL,
	`inputs` text NOT NULL,
	`rendered_prompt` text NOT NULL,
	`expanded_prompt` text,
	`request_snapshot` text,
	`resolution` text NOT NULL,
	`duration` integer NOT NULL,
	`ratio` text NOT NULL,
	`prompt_expansion` text NOT NULL,
	`estimated_credits` integer NOT NULL,
	`charged_credits` integer NOT NULL,
	`refunded` integer DEFAULT false NOT NULL,
	`fal_request_id` text,
	`fal_seed` integer,
	`result_key` text,
	`error_message` text,
	`queue_position` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`started_at` integer,
	`finished_at` integer
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`credits` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL
);
