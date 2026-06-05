import type { NextConfig } from "next";

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
