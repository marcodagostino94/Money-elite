import type { NextConfig } from "next";

const repositoryBasePath = process.env.GITHUB_ACTIONS ? "/Money-elite" : "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: repositoryBasePath,
  assetPrefix: repositoryBasePath || undefined,
  turbopack: { root: process.cwd() },
};

export default nextConfig;
