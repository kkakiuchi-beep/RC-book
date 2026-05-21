import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google アカウントのプロフィール写真
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      // Firebase Storage にアップロードした写真
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
    ],
  },
};

export default nextConfig;
