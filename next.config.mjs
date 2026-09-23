/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Preserve Next 14 client router cache behavior (dynamic pages cached 30s).
  experimental: {
    forceSwcTransforms: true,
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
