import "dotenv/config";

export const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  (process.env.DATABASE_URL ?? "").replace(/\/rbms(\?|$)/, "/rbms_test$1") ??
  "postgresql://rbms:rbms_dev_password@localhost:5432/rbms_test";
