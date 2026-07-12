import { PrismaClient, type Prisma } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const SERIALIZATION_FAILURE_RETRIES = 3;

/**
 * Runs `fn` in a SERIALIZABLE transaction, retrying on serialization
 * failures (Postgres 40001 / Prisma P2034). Use for every mutation that
 * posts inventory movements or checks-then-writes.
 */
export async function withSerializableTx<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= SERIALIZATION_FAILURE_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(fn, { isolationLevel: "Serializable" });
    } catch (error) {
      lastError = error;
      const code = (error as { code?: string })?.code;
      if (code !== "P2034") throw error;
    }
  }
  throw lastError;
}
