import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone",
  cleanDistDir: true,
  outputFileTracingRoot: __dirname,
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
