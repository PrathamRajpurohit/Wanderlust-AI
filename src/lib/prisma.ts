import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Lazily initialise PrismaClient — only when a query is first made.
// This prevents crashes during `next build` when DATABASE_URL is absent.
let _client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (_client) return _client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your Vercel environment variables."
    );
  }

  const adapter = new PrismaNeon({ connectionString });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _client = new PrismaClient({ adapter } as any);
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
