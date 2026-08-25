import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Self-contained server bundle for a small production Docker image. The
  // standalone server also hosts the Node-runtime BFF routes (/api/apollo/*),
  // which proxy ApolloStorage's REST API server-side (the secret boundary — the
  // optional APOLLO_TOKEN never reaches the browser).
  output: "standalone",
};

export default nextConfig;
