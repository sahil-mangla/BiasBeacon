import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/api/:path*',
      },
      {
        source: '/metrics/:path*',
        destination: 'http://localhost:8080/metrics/:path*',
      },
      {
        source: '/forecast/:path*',
        destination: 'http://localhost:8080/forecast/:path*',
      },
      {
        source: '/drift/:path*',
        destination: 'http://localhost:8080/drift/:path*',
      },
      {
        source: '/savings',
        destination: 'http://localhost:8080/savings',
      },
      {
        source: '/health',
        destination: 'http://localhost:8080/health',
      },
    ];
  },
};

export default nextConfig;
