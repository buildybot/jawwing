import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jawwing/db", "@jawwing/api", "@jawwing/mod"],
};

export default nextConfig;
