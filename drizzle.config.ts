import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit is a separate CLI process, not the Next.js runtime - it does
// not auto-load .env.local the way `next dev`/`next build` do, so this has
// to be done explicitly here.
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
