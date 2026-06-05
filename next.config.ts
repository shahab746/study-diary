import type { NextConfig } from "next";

// Ensure DATABASE_URL is set at build time for Prisma.
// When using Turso driver adapter on Vercel, DATABASE_URL is not used for
// actual queries, but Prisma's generated client requires it at import time.
// Without this, Prisma throws: "URL_INVALID: The URL 'undefined' is not valid"
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./dummy.db";
}

const nextConfig: NextConfig = {
  // output: "standalone", // Disabled - causes issues with next start
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  turbopack: {},
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client"],
};

export default nextConfig;
