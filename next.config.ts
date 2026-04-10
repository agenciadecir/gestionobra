import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "https://preview-chat-76f4f445-b24d-4ad8-bb68-219b9d089ae1.space.z.ai",
  ],
};

export default nextConfig;
