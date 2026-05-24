/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ ESLint:
  // - لن يوقف `next build` حتى لو عندك أخطاء lint.
  // - ما زال بإمكانك تشغيله يدويًا عبر: `npm run lint`
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ✅ TypeScript:
  // - هنا "مهم": لو فيه أخطاء TypeScript حقيقية → الـ build سيفشل.
  // - هذا يحميك من رفع كود فيه مشاكل Types ممكن تسبب صفحات بيضاء/أخطاء runtime.
  typescript: {
    ignoreBuildErrors: false,
  },

  // ✅ Next/Image:
  // - unoptimized: true يعني تعطيل تحسين الصور من Next (مفيد لبعض الاستضافات/الستاتيك).
  // - إذا كنت على Vercel وتريد تحسين تلقائي للصور، احذف هذا الخيار أو اجعله false.
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
