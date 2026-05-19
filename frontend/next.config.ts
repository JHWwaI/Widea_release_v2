import type { NextConfig } from "next";

const backendOrigin = (process.env.BACKEND_ORIGIN || "http://localhost:3001").replace(/\/$/, "");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
