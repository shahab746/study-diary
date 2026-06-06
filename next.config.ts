import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  turbopack: {},
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-libsql", "@libsql/client"],
};

export default withPWA({
  dest: "public",
  disable: false,
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/docs\.google\.com\/spreadsheets\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "google-sheets",
        expiration: { maxEntries: 20, maxAgeSeconds: 5 * 60 },
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /^https:\/\/my-project-rho-snowy\.vercel\.app\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-calls",
        expiration: { maxEntries: 50, maxAgeSeconds: 2 * 60 },
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-images",
        expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
})(nextConfig);
