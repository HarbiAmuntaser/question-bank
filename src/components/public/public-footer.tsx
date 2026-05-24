// file: src/components/public/public-footer.tsx
/**
 * PublicFooter (Server Component)
 *
 * فوتر عام “واعي بالدولة” عبر prop:
 * - يستقبل cc من الصفحة (أفضل أداء + أدق لأن السيرفر لا يقرأ pathname مباشرة)
 * - يبني روابط “الروابط السريعة” حسب الدولة:
 *   الصفحة الرئيسية: /{cc}
 *   الجامعات:        /{cc}/university
 *   المدارس:         /{cc}/school
 *   الأكاديميات:     /{cc}/academy
 *   المدونة:         /{cc}/blog (Placeholder)
 *
 * ملاحظة:
 * - هذا الملف Server Component (لا يوجد "use client")
 * - لتفادي تحويله إلى Client بالخطأ: استخدمنا عناصر HTML بدل Button/Input/Separator
 */

import Link from "next/link";
import {
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Twitter,
  Instagram,
  Youtube,
} from "lucide-react";

import {
  SUPPORTED_COUNTRIES,
  DEFAULT_COUNTRY,
  type CountryCode,
} from "@/config/regions";
import { normalizeCountry } from "@/lib/route-helpers";

type Props = {
  /** كود الدولة القادم من params: SA | YE */
  cc?: string;
};

// بيانات قابلة للتخصيص لاحقًا حسب الدولة
const CONTACT_BY_COUNTRY: Record<
  CountryCode,
  { email: string; phone: string; location: string }
> = {
  SA: {
    email: "info@questionbank.example",
    phone: "+966 11 000 0000",
    location: "المملكة العربية السعودية",
  },
  YE: {
    email: "info@questionbank.example",
    phone: "+967 1 000 000",
    location: "اليمن",
  },
};

export function PublicFooter({ cc: ccProp }: Props) {
  // توحيد cc والتأكد أنه مدعوم
  const cc = normalizeCountry(ccProp ?? DEFAULT_COUNTRY);
  const countryLabel = SUPPORTED_COUNTRIES[cc]?.label ?? cc;

  // روابط سريعة حسب الدولة
  const quickLinks = [
    { label: "الصفحة الرئيسية", href: `/${cc}` },
    { label: "الجامعات", href: `/${cc}/university` },
    { label: "المدارس", href: `/${cc}/school` },
    { label: "الأكاديميات", href: `/${cc}/academy` },
    { label: "المدونة", href: `/${cc}/blog` }, // Placeholder
  ] as const;

  const contact = CONTACT_BY_COUNTRY[cc];
  const year = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                aria-hidden
              >
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <div className="font-bold text-xl">بنك الأسئلة</div>
                <div className="text-xs text-gray-400">إصدار {countryLabel}</div>
              </div>
            </div>

            <p className="text-gray-300 text-sm leading-relaxed">
              منصة تعليمية تساعد الطلاب على المراجعة والتحضير عبر مكتبة منظمة من
              الأسئلة والاختبارات، مع دعم محتوى مخصص لكل دولة ونوع مؤسسة.
            </p>

            {/* Social (Placeholder links) */}
            <div className="flex space-x-3 space-x-reverse">
              <SocialIcon href="#" label="Facebook">
                <Facebook className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon href="#" label="Twitter">
                <Twitter className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon href="#" label="Instagram">
                <Instagram className="h-5 w-5" />
              </SocialIcon>
              <SocialIcon href="#" label="YouTube">
                <Youtube className="h-5 w-5" />
              </SocialIcon>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">روابط سريعة</h3>
            <div className="space-y-2">
              {quickLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  // الفوتر أقل أولوية عادة، فنوقف prefetch لتقليل طلبات الشبكة
                  prefetch={false}
                  className="block text-gray-300 hover:text-white transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Support (عام حالياً) */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">الدعم والمساعدة</h3>
            <div className="space-y-2">
              <Link
                href="/public/help"
                prefetch={false}
                className="block text-gray-300 hover:text-white transition-colors"
              >
                مركز المساعدة
              </Link>
              <Link
                href="/public/faq"
                prefetch={false}
                className="block text-gray-300 hover:text-white transition-colors"
              >
                الأسئلة الشائعة
              </Link>
              <Link
                href="/public/contact"
                prefetch={false}
                className="block text-gray-300 hover:text-white transition-colors"
              >
                تواصل معنا
              </Link>
              <Link
                href="/public/privacy"
                prefetch={false}
                className="block text-gray-300 hover:text-white transition-colors"
              >
                سياسة الخصوصية
              </Link>
              <Link
                href="/public/terms"
                prefetch={false}
                className="block text-gray-300 hover:text-white transition-colors"
              >
                شروط الاستخدام
              </Link>
            </div>
          </div>

          {/* Newsletter (Placeholder) + Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">ابق على اطلاع</h3>
            <p className="text-gray-300 text-sm">
              اشترك لتصلك التحديثات عند إضافة اختبارات ومصادر جديدة (قريبًا).
            </p>

            {/* Placeholder: بدون JS حالياً */}
            <div className="space-y-2" aria-label="نموذج الاشتراك (قريباً)">
              <label htmlFor="newsletter-email" className="sr-only">
                بريدك الإلكتروني
              </label>
              <input
                id="newsletter-email"
                type="email"
                placeholder="بريدك الإلكتروني"
                className="w-full h-10 rounded-md bg-gray-800 border border-gray-700 px-3 text-white placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-primary"
                inputMode="email"
                disabled
              />
              <button
                type="button"
                disabled
                className="w-full h-10 rounded-md bg-gray-700 text-white/80 cursor-not-allowed"
              >
                اشتراك (قريبًا)
              </button>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 pt-4">
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-300">
                <Mail className="h-4 w-4" aria-hidden />
                <span>{contact.email}</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-300">
                <Phone className="h-4 w-4" aria-hidden />
                <span>{contact.phone}</span>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-300">
                <MapPin className="h-4 w-4" aria-hidden />
                <span>{contact.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div className="my-8 h-px bg-gray-700" />

        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-300 text-sm">
            © {year} بنك الأسئلة. جميع الحقوق محفوظة.
          </p>

          {/* سياسات عامة (يمكن لاحقاً جعلها تحت /{cc}/...) */}
          <div className="flex space-x-6 space-x-reverse mt-4 md:mt-0">
            <Link
              href="/public/privacy"
              prefetch={false}
              className="text-gray-300 hover:text-white text-sm transition-colors"
            >
              الخصوصية
            </Link>
            <Link
              href="/public/terms"
              prefetch={false}
              className="text-gray-300 hover:text-white text-sm transition-colors"
            >
              الشروط
            </Link>
            <Link
              href="/public/cookies"
              prefetch={false}
              className="text-gray-300 hover:text-white text-sm transition-colors"
            >
              ملفات تعريف الارتباط
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** أيقونة سوشيال كرابط (Placeholder) */
function SocialIcon({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
      rel="noreferrer"
    >
      {children}
    </a>
  );
}
