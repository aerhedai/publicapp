# publicapp

Foundation for a user-facing app: auth, database, file storage, and API
security scaffolding. Video-generation specifics are deliberately not part
of this repo yet - `generation_jobs.input` is a generic jsonb blob for that
to plug into later.

## Stack

- **Next.js 16** (App Router, Turbopack) - note the `middleware.ts` file
  convention is deprecated in this version, renamed to `proxy.ts` (see
  `src/proxy.ts`). Don't recreate a `middleware.ts` file from habit.
- **Clerk** - auth. `src/proxy.ts` is default-deny: every route requires a
  signed-in user unless explicitly added to the `isPublicRoute` allowlist.
- **Neon + Drizzle ORM** - Postgres. Schema in `src/db/schema.ts`.
- **Cloudflare R2** - file storage, accessed via the S3-compatible API.
  Client in `src/storage/r2.ts`.
- **Upstash Redis** - rate limiting (`src/lib/rate-limit.ts`).

## One-time setup - accounts to create

Copy `.env.example` to `.env.local` and fill in each value from these:

1. **Clerk** (https://dashboard.clerk.com)
   - Create an application.
   - API Keys page -> copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
   - Webhooks page -> add an endpoint pointing at `https://<your-domain>/api/webhooks/clerk`,
     subscribe to `user.created`, `user.updated`, `user.deleted` -> copy the
     signing secret into `CLERK_WEBHOOK_SIGNING_SECRET`.
   - In local dev, Clerk's webhook can't reach `localhost` directly - use the
     Clerk CLI (`clerk webhook listen`) or a tunnel (ngrok/Cloudflare Tunnel)
     to test the `user.created` sync path before shipping.

2. **Neon** (https://console.neon.tech)
   - Create a project.
   - Connection Details -> copy the **pooled** connection string into `DATABASE_URL`.
   - Run `npm run db:push` once this is set, to create the tables from
     `src/db/schema.ts`. Use `npm run db:generate` + `npm run db:migrate`
     instead once you want real migration files tracked in git rather than
     `push`'s direct-sync behavior.

3. **Cloudflare R2** (https://dash.cloudflare.com -> R2)
   - Create a bucket.
   - Manage API Tokens -> create a token scoped to that bucket only (not
     account-wide) -> copy Account ID, Access Key ID, Secret Access Key.
   - Fill in `R2_BUCKET_NAME` and `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`.
   - `R2_PUBLIC_BASE_URL` only matters once you make specific objects public
     (e.g. shareable output videos) - leave blank until then.

4. **Upstash Redis** (https://console.upstash.com)
   - Create a database (regional, not global, is fine and cheaper for this).
   - REST API section -> copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

Then:

```bash
npm install
npm run db:push
npm run dev
```

## Security decisions baked into this foundation - read before changing

- **`src/proxy.ts` is default-deny.** Every new public page/route must be
  added to the `isPublicRoute` matcher explicitly. If a route isn't there,
  it requires a signed-in Clerk session automatically - this is
  deliberate, don't "fix" a 401 by widening the allowlist without checking
  whether that route is actually meant to be public.
- **Every DB query for user-owned data filters by `userId` in the `WHERE`
  clause itself**, not as a check after fetching (see `src/app/api/jobs/[id]/route.ts`).
  A resource that exists but belongs to someone else returns the same 404
  as one that doesn't exist, so these endpoints can't be used to enumerate
  other users' resource ids.
- **Storage keys are always server-generated**, namespaced under
  `users/<userId>/...`, never accepted from the client (`src/storage/r2.ts`).
  `assertOwnsKey` exists for the day you add a "delete my upload" or
  similar endpoint - use it before trusting any client-supplied key.
- **`src/db/client.ts` and `src/storage/r2.ts` are lazily initialized.**
  Do not change them back to throwing at module-import time if env vars
  are missing - that breaks Next.js's build-time page-data collection for
  every route that merely imports them, not just ones that run at build
  time. This was a real bug caught while building this foundation, not a
  hypothetical.
- **The Clerk webhook route verifies the svix signature before touching
  the database.** It's on the public allowlist for exactly this reason -
  it authenticates itself, so it doesn't need (and can't use) a user
  session. Don't add other unauthenticated routes without the same kind
  of self-verification.
- **Rate limiting is keyed by Clerk `userId`, not IP** - IPs are shared
  (NAT, mobile carriers) and spoofable via headers; a signed-in user id is
  neither. Unauthenticated routes have no rate limiter yet, which is fine
  since the only one that exists (`/api/webhooks/clerk`) is protected by
  signature verification instead.
- **CSP in `next.config.ts` allowlists only Clerk's known origins.** It has
  not been tested against a real Clerk project yet (no real keys were
  available while building this) - if Clerk's widgets fail to load once
  you plug in real keys, check the browser console for CSP violations
  first before assuming it's a Clerk configuration issue.
- **Credits are a ledger (`credit_ledger`), not a mutable balance column.**
  Compute a user's balance by summing their rows; never add a `balance`
  column you update in place - that loses the audit trail and makes a
  double-spend bug much easier to introduce silently.

## What's deliberately not here yet

- Payments/Stripe integration (credits ledger table exists, nothing writes
  to it yet).
- The actual video-generation job worker/queue consumer - `generation_jobs`
  rows get created with `status: "queued"` and nothing currently picks
  them up.
- A public shareable-output page (`/shared/(.*)` is already allowlisted in
  `src/proxy.ts` for when this exists).
- Deployment config (Vercel for the app, wherever the queue worker ends up
  running).
