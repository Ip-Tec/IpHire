import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Creates .next/standalone/server.js for Tauri sidecar
  images: {
    unoptimized: true,  // Avoids Sharp dependency in standalone bundle
  },
  // bcrypt uses native Node.js addons — exclude from webpack bundling
  serverExternalPackages: ["bcrypt"],
};

export default nextConfig;
