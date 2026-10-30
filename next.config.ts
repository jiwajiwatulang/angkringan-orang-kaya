import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  env: {
    NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE: 'enabled',
  },
  // @ts-ignore
  allowedDevOrigins: ['192.168.110.119', 'localhost', '127.0.0.1']
};

export default nextConfig;
