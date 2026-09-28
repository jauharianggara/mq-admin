import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // workspace root = repo ini (bukan C:\Users\jauha yang punya package-lock.json lain)
  outputFileTracingRoot: path.resolve(__dirname),
  // deploy server: runtime minimal tanpa node_modules penuh (plan synergy .116)
  output: "standalone",
};

export default nextConfig;
