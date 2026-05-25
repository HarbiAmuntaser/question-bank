/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // Next/Image stays optimized; public-facing images are local placeholders/assets.
  images: {},
};

export default nextConfig;
