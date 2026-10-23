import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  // Production rollout is enabled by default; explicit opt-out remains available.
  env: {
    NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE: process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE ?? 'enabled',
  },
  // @ts-ignore
  allowedDevOrigins: ['192.168.110.119', 'localhost', '127.0.0.1']
};

export default nextConfig;
