/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  experimental: {
    forceSwcTransforms: true,
  },
};

export default nextConfig;
