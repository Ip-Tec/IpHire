import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // Creates .next/standalone/server.js for Tauri sidecar
  images: {
    unoptimized: true,  // Avoids Sharp dependency in standalone bundle
  },
};

export default nextConfig;
