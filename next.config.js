// next.config.js (ESM syntax)
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 這一行確保使用 Node runtime
  experimental: {
    runtime: "nodejs",
  },
};

export default nextConfig;