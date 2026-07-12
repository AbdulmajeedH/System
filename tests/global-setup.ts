import { execSync } from "child_process";
import { TEST_DATABASE_URL } from "./helpers/test-db-url";

/**
 * Applies migrations to the (separate) test database. Non-destructive:
 * tests create their own uniquely-suffixed rows and never assume a
 * pristine database.
 */
export default function setup() {
  execSync("npx prisma migrate deploy", {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
