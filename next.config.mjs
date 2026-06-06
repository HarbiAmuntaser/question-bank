/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,

  eslint: {
    ignoreDuringBuilds: false,
  },

  typescript: {
    ignoreBuildErrors: false,
  },

  // Next/Image stays optimized; public-facing images are local placeholders/assets.
  images: {},
};

export default nextConfig;
