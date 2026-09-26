import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

type DbClient = ReturnType<typeof drizzle<typeof schema>>;
let cached: DbClient | null = null;

function getDb(): DbClient {
  if (cached) return cached;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set - copy .env.example to .env.local and fill it in");
  }
  const sql = neon(process.env.DATABASE_URL);
  cached = drizzle(sql, { schema });
  return cached;
}

// A Proxy so every existing `db.select(...)` call site stays unchanged, but
// the real client - and its env-var check - only gets constructed on first
// actual use at request time. Throwing eagerly at module-import time breaks
// Next.js's build-time page-data collection for any route that merely
// imports this file, even ones that never run at build time.
export const db: DbClient = new Proxy({} as DbClient, {
  get(_target, prop) {
    return Reflect.get(getDb() as object, prop);
  },
});
