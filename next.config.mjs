/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
};

export default nextConfig;

import('@opennextjs/cloudflare').then(m => m.initOpenNextCloudflareForDev());
