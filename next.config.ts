import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't ship the "X-Powered-By" header.
  poweredByHeader: false,

  // Build-time saver. Opt in per project with a Vercel env var when type
  // checking already runs elsewhere (CI, pre-push hook). Read here only, so it
  // is deliberately not part of the src/config/env.ts schema.
  typescript: {
    ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1",
  },

  // Source maps for the browser bundle are slow to generate and rarely needed.
  productionBrowserSourceMaps: false,
};

export default nextConfig;
