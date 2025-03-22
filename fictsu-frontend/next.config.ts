import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/f/:fiction_id",
        destination: "/fiction/:fiction_id",
      },
      {
        source: "/f/:fiction_id/:chapter_id",
        destination: "/fiction/:fiction_id/:chapter_id",
      },
      {
        source: "/f/create",
        destination: "/fiction/create",
      },
      {
        source: "/f/edit",
        destination: "/fiction/edit",
      },
      {
        source: "/f/:fiction_id/:chapter_id/edit",
        destination: "/fiction/:fiction_id/:chapter_id/edit",
      },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
  },
};

export default nextConfig;
