import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const dbUrl = process.env.DATABASE_URL;
  const hasDbUrl = !!dbUrl;
  const isPlaceholder = dbUrl?.includes("user:password@host/dbname");
  const isPostgres =
    hasDbUrl &&
    !isPlaceholder &&
    (dbUrl!.startsWith("postgresql://") || dbUrl!.startsWith("postgres://"));

  const checks: Record<string, string> = {
    DATABASE_URL: !hasDbUrl
      ? "❌ MISSING — Set this in Vercel Environment Variables"
      : isPlaceholder
      ? "❌ PLACEHOLDER — Replace with your real Neon connection string"
      : isPostgres
      ? "✅ Set (PostgreSQL)"
      : "⚠️ Set but unrecognised format",

    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
      ? "✅ Set"
      : "❌ MISSING — Generate with: openssl rand -base64 32",

    NEXTAUTH_URL: process.env.NEXTAUTH_URL
      ? `✅ Set (${process.env.NEXTAUTH_URL})`
      : "⚠️ Not set (optional on Vercel — it auto-detects)",

    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
      ? "✅ Set"
      : "❌ MISSING — Required for AI trip planning",

    TAVILY_API_KEY: process.env.TAVILY_API_KEY
      ? "✅ Set"
      : "❌ MISSING — Required for web search in agents",

    NODE_ENV: process.env.NODE_ENV ?? "unknown",
  };

  // Try a quick DB ping
  let dbPing = "Not attempted";
  if (isPostgres) {
    try {
      const { prisma } = await import("@/lib/prisma");
      await (prisma as any).$queryRaw`SELECT 1`;
      dbPing = "✅ Connected";
    } catch (err: any) {
      dbPing = `❌ Failed: ${err?.message?.slice(0, 120) ?? "Unknown error"}`;
    }
  }

  return NextResponse.json(
    { checks, dbPing },
    { status: 200 }
  );
}
