import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for better-sqlite3 native module support in Next.js API routes
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
  
  // Extend the default serverless function timeout for AI agent calls
  experimental: {},
};

export default nextConfig;
