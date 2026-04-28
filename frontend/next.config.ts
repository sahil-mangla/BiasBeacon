import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
    console.log(`[NextConfig] Using BACKEND_URL: ${backendUrl}`);
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/metrics/:path*',
        destination: `${backendUrl}/metrics/:path*`,
      },
      {
        source: '/forecast/:path*',
        destination: `${backendUrl}/forecast/:path*`,
      },
      {
        source: '/drift/:path*',
        destination: `${backendUrl}/drift/:path*`,
      },
      {
        source: '/savings',
        destination: `${backendUrl}/savings`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

export default nextConfig;
