import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  // Pinned to the workspace root so Turbopack resolves hoisted pnpm dependencies and workspace packages.
  turbopack: { root: path.join(__dirname, "../..") },
};

export default nextConfig;
