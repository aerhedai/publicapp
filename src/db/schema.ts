import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  pgEnum,
  bigint,
  boolean,
  uniqueIndex,
  type AnyPgColumn,
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
export const creditLedger = pgTable(
  "credit_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(), // positive = credit purchase/grant, negative = spend
    reason: text("reason").notNull(), // e.g. "stripe_checkout", "generation_spend", "signup_bonus"
    // External idempotency key (e.g. a Stripe Checkout Session id) - Stripe
    // redelivers webhooks, so this + the unique index below is what makes
    // "credit this purchase" safe to process more than once. Null for
    // internally-sourced rows (generation reserve/refund, signup bonus).
    externalRef: text("external_ref"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Postgres unique indexes allow multiple NULLs, so non-Stripe rows
    // (which never set externalRef) never collide with each other.
    uniqueIndex("credit_ledger_external_ref_idx").on(table.externalRef),
  ]
);

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
// every job, not inferred from `input`'s shape. "stitch" doesn't dispatch to
// RunPod at all - it's executed in-process (see src/lib/stitch.ts) since
// concatenating already-encoded clips is fast, CPU-only work; it still flows
// through this same table/status/credit machinery for uniformity.
export const jobType = pgEnum("job_type", ["image", "video", "stitch"]);

export const projectStatus = pgEnum("project_status", [
  "draft",
  "generating",
  "stitching",
  "done",
  "failed",
]);

// "generate" - this clip is (or will be) a fresh AI-generated scene.
// "existing" - this clip reuses a past completed video job's output.
export const clipSource = pgEnum("clip_source", ["generate", "existing"]);

// A reusable, user-owned media reference (photo or audio clip) - either
// uploaded directly or minted by a prior "generate a reference image" job.
// Distinct from `uploads`: this is a persistent cross-job library (the
// picker modal's "Uploads" tab), not a one-off file.
export const referenceSource = pgEnum("reference_source", ["uploaded", "generated"]);

// "image" or "audio" - video is deliberately not a reference type yet, since
// no worker (image or video) can consume a video file as input today.
export const mediaReferenceType = pgEnum("media_reference_type", ["image", "audio"]);

export const characterReferences = pgTable("character_references", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Display caption only (e.g. the original filename) - no longer a matching
  // key. Matching a specific reference now happens via @Image1/@Audio1 tags
  // resolved against the current compose session's attachment order (see
  // src/lib/scene-validation.ts's resolveReferenceTags), not by name.
  label: text("label").notNull(),
  mediaType: mediaReferenceType("media_type").notNull().default("image"),
  storageKey: text("storage_key").notNull(),
  source: referenceSource("source").notNull(),
  sourceJobId: uuid("source_job_id"), // set when source = "generated"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

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

    // Set when this job's real purpose is minting a new character_references
    // row (the "generate a reference photo for N credits" flow), not just
    // producing a normal user-facing output. When set and the job completes
    // successfully, apply-job-result.ts also inserts into characterReferences
    // using this as the label and the job's own output as the storage key.
    createsReferenceLabel: text("creates_reference_label"),

    // Set when this job is one scene in a storyboard project (see
    // advanceProject in src/lib/projects.ts) - lets the completion path
    // (applyRunpodResult, called from both the webhook and the stale-job
    // sweep) know to advance the project's state machine without a reverse
    // query. Null for standalone (non-project) jobs, which is most of them.
    projectClipId: uuid("project_clip_id").references((): AnyPgColumn => projectClips.id, {
      onDelete: "set null",
    }),

    // The actual seed the worker used for this image (from the RunPod
    // webhook's output.seed - apply-job-result.ts persists it on success).
    // Null for video/stitch, and for any image job predating this column.
    // Lets "Edit" (job-tile.tsx) re-run the exact same seed with a changed
    // prompt instead of only ever getting a fresh random one.
    // bigint, not integer - RunPod can return a seed up to the full
    // unsigned 32-bit range (~4.29 billion), which overflows Postgres's
    // signed 32-bit `integer` (max ~2.15 billion). Confirmed live: a real,
    // successfully-completed job's webhook failed on every retry with
    // "value ... is out of range for type integer" - the whole completion
    // write is one atomic statement (see apply-job-result.ts), so the
    // overflow silently rolled back the entire update, leaving a genuinely
    // finished job stuck non-terminal forever.
    seed: bigint("seed", { mode: "number" }),

    // Set when this job is a free-regeneration attempt - always points at
    // the ROOT original (never chains - regenerating a regenerated result
    // still points here, collapsed to the same root via
    // `original.regeneratedFromJobId ?? original.id` in POST /api/jobs), so
    // the "2 free regens, within 30s of the original's completion" cap in
    // credits.ts's computeJobCostWithFreeRegen can be checked with one
    // query against one shared root rather than walking a chain. Null for
    // every normal, non-regenerated job.
    regeneratedFromJobId: uuid("regenerated_from_job_id").references((): AnyPgColumn => generationJobs.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Postgres unique indexes allow multiple NULLs, so jobs that haven't
    // been dispatched yet (runpodJobId still null) don't collide.
    uniqueIndex("generation_jobs_runpod_job_id_idx").on(table.runpodJobId),
  ]
);

// A storyboard: an ordered sequence of clips (mixing freshly-generated
// scenes and reused past clips) that gets stitched into one final video
// once every clip has a resolved output.
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  status: projectStatus("status").notNull().default("draft"),
  // The generation_jobs row (type="stitch") that produces the final video -
  // null until every clip has resolved and the stitch job is created.
  stitchJobId: uuid("stitch_job_id").references((): AnyPgColumn => generationJobs.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const projectClips = pgTable(
  "project_clips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    orderIndex: integer("order_index").notNull(),
    source: clipSource("source").notNull(),
    // Only for source="generate" - shape is {scene: PublicVideoScene,
    // characterRefs: Record<label, storageKey>}, exactly what /api/chat's
    // "ready" response gives the frontend (see scene-validation.ts) - saved
    // here once the user finishes authoring the scene, then turned into a
    // generation_jobs row once this clip's turn comes up (advanceProject's
    // sequential dispatch, src/lib/projects.ts).
    sceneDraft: jsonb("scene_draft"),
    // Only for source="existing" - COPIED from the chosen past job's
    // outputStorageKey at pick time, not a live reference to that job. This
    // lets the same past clip be reused across multiple projects/clips
    // without an ownership/reuse conflict on the job row itself.
    existingOutputStorageKey: text("existing_output_storage_key"),
    // Only for source="generate" - set once that scene's generation_jobs
    // row is created (by advanceProject, respecting the one-in-flight-job-
    // per-user cap - see src/app/api/jobs/route.ts).
    generationJobId: uuid("generation_job_id").references((): AnyPgColumn => generationJobs.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("project_clips_project_id_order_index_idx").on(table.projectId, table.orderIndex)]
);

export const subscriptionStatus = pgEnum("subscription_status", [
  "active",
  "past_due",
  "canceled",
  "incomplete",
]);

// One row per user's Stripe subscription - tracks the tier/status so the
// account page can render "Creator plan, renews Oct 30" without a live
// Stripe API call, and so customer.subscription.* webhooks have somewhere
// to write. NOT what grants credits - invoice.paid does that, straight into
// credit_ledger keyed by invoice id - this table is display/lifecycle state
// only. userId is unique: a user has at most one active subscription at a
// time (upgrading/downgrading changes the Stripe subscription in place via
// the Customer Portal, it doesn't create a second row).
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id").notNull(),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().unique(),
  tierId: text("tier_id").notNull(), // matches PricingTier.id in src/lib/pricing-tiers.ts
  status: subscriptionStatus("status").notNull(),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
