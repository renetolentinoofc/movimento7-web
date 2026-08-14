import type { NextConfig } from "next";

const apiOrigin = process.env.INTERNAL_API_URL ?? "http://127.0.0.1:5000";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Render Free has 512 MB shared by the Node process and native modules.
  // Keep the incremental cache on disk instead of reserving Next's default
  // 50 MB in the V8 heap.
  cacheMaxMemorySize: 0,
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  reactStrictMode: true,
  experimental: {
    // Route modules are loaded on demand, leaving more startup headroom on
    // memory-constrained instances.
    preloadEntriesOnStart: false
  },
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${apiOrigin}/api/v1/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      }
    ];
  }
};

export default nextConfig;
