import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client", "bcryptjs", "xlsx"],
  experimental: {
    serverActions: {
      // Matches clone sample max (25 MB) in voice profiles.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
