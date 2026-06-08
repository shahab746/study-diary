import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicators: false,
  turbopack: {},
  serverExternalPackages: [],
  allowedDevOrigins: [
    /^https?:\/\/[a-z0-9-]+\.space-z\.ai$/,
  ],
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
      urlPattern: /\/api\/data.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-data",
        expiration: { maxEntries: 30, maxAgeSeconds: 2 * 60 },
        networkTimeoutSeconds: 8,
      },
    },
    {
      urlPattern: /\/api\/subject\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-subject",
        expiration: { maxEntries: 30, maxAgeSeconds: 5 * 60 },
        networkTimeoutSeconds: 8,
      },
    },
    {
      urlPattern: /\/api\/health.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-health",
        expiration: { maxEntries: 10, maxAgeSeconds: 60 },
        networkTimeoutSeconds: 5,
      },
    },
    {
      urlPattern: /\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|woff2?)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-assets",
        expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
})(nextConfig);
