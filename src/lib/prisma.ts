import { PrismaClient } from "@prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;

  const isPlaceholder =
    !connectionString ||
    connectionString.includes("user:password@host/dbname") ||
    connectionString === "";

  const isPostgres =
    !isPlaceholder &&
    (connectionString!.startsWith("postgresql://") ||
      connectionString!.startsWith("postgres://"));

  if (isPostgres) {
    // Neon PostgreSQL (used in production / Vercel)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PrismaNeon } = require("@prisma/adapter-neon");
    const adapter = new PrismaNeon({ connectionString });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new PrismaClient({ adapter } as any);
  }

  if (process.env.NODE_ENV === "production") {
    // In production (Vercel), SQLite is not available and DATABASE_URL must be a valid PostgreSQL URL.
    throw new Error(
      "DATABASE_URL is missing or invalid. " +
        "Please set a valid PostgreSQL connection string (e.g. from Neon) " +
        "in your Vercel environment variables."
    );
  }

  // Local development — use Better SQLite3
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({
    url: "file:./dev.db",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

// Lazily initialise PrismaClient — only when a query is first made.
// This prevents crashes during `next build` when DATABASE_URL is absent.
let _client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (_client) return _client;
  _client = globalForPrisma.prisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = _client;
  }
  return _client;
}

// Export a Proxy so callers keep the `prisma.user.findUnique(...)` syntax
// while the real client is only created on first property access at runtime.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (getClient() as any)[prop];
  },
});
