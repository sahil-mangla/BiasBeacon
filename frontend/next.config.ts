import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const backendUrl = 'https://backend-436542799320.us-central1.run.app';
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
