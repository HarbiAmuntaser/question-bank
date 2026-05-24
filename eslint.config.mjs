// نحتاج dirname + fileURLToPath لأن هذا الملف ES Modules (mjs)
import { dirname } from "path";
import { fileURLToPath } from "url";

// FlatCompat يسمح لنا باستخدام إعدادات ESLint القديمة (extends)
// داخل نظام الـ Flat Config الجديد (eslint.config.mjs)
import { FlatCompat } from "@eslint/eslintrc";

// نحول import.meta.url لمسار ملف فعلي (مثل __filename في CommonJS)
const __filename = fileURLToPath(import.meta.url);

// نطلع مجلد الملف (مثل __dirname في CommonJS)
const __dirname = dirname(__filename);

// نجهّز compat ونحدد قاعدة المسار الأساسي
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

// نصدّر إعدادات ESLint (Flat Config)
const eslintConfig = [
  // ✅ تجاهل مجلدات لا نريد ESLint يفحصها (مخرجات بناء/اعتماديات)
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "dist/**"],
  },

  // ✅ إعدادات Next الأساسية:
  // - next/core-web-vitals: قواعد جودة وأداء (مهم لواجهات React/Next)
  // - next/typescript: تفعيل تكامل TypeScript + قواعده
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // ✅ تعديلات مشروعك (Overrides على القواعد)
  {
    rules: {
      // ✅ بدل ما تكون Error (وتفشل lint)، نخليها Warning
      // هذا يعني: يظهر تنبيه، لكن ما يوقف `npm run lint`.
      "@typescript-eslint/no-explicit-any": "warn",

      // ✅ خيار عملي جدًا:
      // لو عندك متغيرات/باراميترات تبدأ بـ _ ما يعتبرها خطأ
      // مثال: function x(_req, res) {}
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  /*
  // (اختياري جدًا) لو عندك ملفات محددة فيها تعامل ديناميكي كثير وتحتاج any مؤقتًا:
  {
    files: ["src/lib/**", "src/app/api/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  */
];

export default eslintConfig;
