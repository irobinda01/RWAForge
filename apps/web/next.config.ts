import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rwaforge/types", "@rwaforge/stacks"],
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
