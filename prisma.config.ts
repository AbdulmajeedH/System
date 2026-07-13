import "dotenv/config";
import { defineConfig } from "prisma/config";

// The CLI (migrate deploy/dev, db seed) must use a DIRECT connection —
// pooled/pgbouncer URLs (e.g. Neon's `-pooler` host) break migrations.
// The app itself connects via DATABASE_URL (pooled is fine there).
const url = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. Define it (and optionally DIRECT_DATABASE_URL for migrations) in the environment.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: { url },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
