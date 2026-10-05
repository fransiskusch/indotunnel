import type { NextConfig } from "next";

const API = process.env.API_BASE_URL ?? "http://localhost:8081";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API}/v1/:path*` }];
  },
};

export default nextConfig;
