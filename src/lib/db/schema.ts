import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  credits: integer("credits").notNull().default(0),
  createdAt: integer("created_at").notNull(),
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  kind: text("kind", { enum: ["image", "video", "audio"] }).notNull(),
  key: text("key").notNull(),
  mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(),
  width: integer("width"),
  height: integer("height"),
  durationSec: real("duration_sec"),
  originalName: text("original_name").notNull(),
  falUrl: text("fal_url"),
  falUrlAt: integer("fal_url_at"),
  createdAt: integer("created_at").notNull(),
});

export const JOB_STATUSES = [
  "queued",
  "uploading",
  "submitting",
  "running",
  "downloading",
  "succeeded",
  "failed",
  "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  templateId: text("template_id").notNull(),
  status: text("status", { enum: JOB_STATUSES }).notNull(),
  inputs: text("inputs", { mode: "json" }).notNull().$type<JobInputs>(),
  renderedPrompt: text("rendered_prompt").notNull(),
  expandedPrompt: text("expanded_prompt"),
  requestSnapshot: text("request_snapshot", { mode: "json" }).$type<Record<string, unknown>>(),
  resolution: text("resolution").notNull(),
  duration: integer("duration").notNull(),
  ratio: text("ratio").notNull(),
  promptExpansion: text("prompt_expansion").notNull(),
  estimatedCredits: integer("estimated_credits").notNull(),
  chargedCredits: integer("charged_credits").notNull(),
  refunded: integer("refunded", { mode: "boolean" }).notNull().default(false),
  falRequestId: text("fal_request_id"),
  falSeed: integer("fal_seed"),
  resultKey: text("result_key"),
  errorMessage: text("error_message"),
  queuePosition: integer("queue_position"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  startedAt: integer("started_at"),
  finishedAt: integer("finished_at"),
});

export type JobInputs = {
  /** slotKey → assetId | "sample:<public path>" | "ref:<refId>" */
  slots: Record<string, string>;
  options: Record<string, string | boolean>;
  consent: boolean;
};

export type User = typeof users.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type NewAsset = typeof assets.$inferInsert;
