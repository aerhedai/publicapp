import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  pgEnum,
  bigint,
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
  "processing",
  "done",
  "failed",
]);

// Deliberately generic - `input` is a jsonb blob so the video-generation
// side of the app can put whatever shape it needs in here without this
// table needing a migration every time that shape changes.
export const generationJobs = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: jobStatus("status").notNull().default("queued"),
  input: jsonb("input").notNull(),
  outputStorageKey: text("output_storage_key"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
