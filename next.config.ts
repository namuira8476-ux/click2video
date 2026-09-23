import type { NextConfig } from "next";

import path from "node:path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "sharp"],
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
