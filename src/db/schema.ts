import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  pgEnum,
  bigint,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Mirrors the Clerk user - Clerk is the source of truth for identity/auth,
// this table exists so other tables have something to foreign-key against
// and so we can store app-specific fields Clerk doesn't hold.
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Clerk user id (e.g. "user_...") - never generate our own
  email: text("email").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Every credit change is its own row (a ledger, not a mutable balance column) -
// so the current balance is always derivable and auditable (a bug can't
// silently corrupt a single counter with no history of how it got there).
export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  delta: integer("delta").notNull(), // positive = credit purchase/grant, negative = spend
  reason: text("reason").notNull(), // e.g. "stripe_checkout", "generation_spend", "signup_bonus"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// A generic reference to a file the user uploaded, stored in R2 under a
// key prefixed with their own user id (see src/storage/r2.ts) - never a
// client-supplied path, always server-generated.
export const uploads = pgTable("uploads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  storageKey: text("storage_key").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const jobStatus = pgEnum("job_status", [
  "queued",
  "warming", // dispatched to the GPU worker, cold-start/container-boot in progress
  "processing",
  "done",
  "failed",
]);

// Picks which ComfyUI workflow template a job dispatches to - required on
// every job, not inferred from `input`'s shape.
export const jobType = pgEnum("job_type", ["image", "video"]);

// Deliberately generic - `input` is a jsonb blob so the video-generation
// side of the app can put whatever shape it needs in here without this
// table needing a migration every time that shape changes.
export const generationJobs = pgTable(
  "generation_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: jobType("type").notNull(),
    status: jobStatus("status").notNull().default("queued"),
    input: jsonb("input").notNull(),
    outputStorageKey: text("output_storage_key"),
    error: text("error"),

    // --- RunPod dispatch / credit reserve-release / idempotency ---
    runpodJobId: text("runpod_job_id"), // correlates an inbound webhook back to this row
    estimatedCredits: integer("estimated_credits"), // reserved at dispatch time, by `type`
    actualCostCents: integer("actual_cost_cents"), // observability only, from RunPod's real exec time
    runpodExecMs: integer("runpod_exec_ms"), // observability only, from the webhook payload
    dispatchAttempts: integer("dispatch_attempts").notNull().default(0),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }), // start of the "warming" window
    // Point at the credit_ledger rows for this job's reserve and eventual
    // confirm/release - `settleLedgerId` being non-null is the idempotency
    // guard against a duplicate webhook delivery re-processing a job.
    reserveLedgerId: uuid("reserve_ledger_id"),
    settleLedgerId: uuid("settle_ledger_id"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Postgres unique indexes allow multiple NULLs, so jobs that haven't
    // been dispatched yet (runpodJobId still null) don't collide.
    uniqueIndex("generation_jobs_runpod_job_id_idx").on(table.runpodJobId),
  ]
);
