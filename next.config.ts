import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  reactCompiler: {
    compilationMode: "annotation",
  },
  images: {
    localPatterns: [
      { pathname: "/api/server/**" },
      { pathname: "/images/**" },
    ],
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
    // If you prefer to skip optimization entirely, set unoptimized: true
    // unoptimized: true,
  },
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: "/api/:path((?!auth).*)",
          destination: `${process.env.NEXT_PUBLIC_API_URL}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
