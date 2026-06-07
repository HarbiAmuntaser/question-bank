import Image from "next/image";
import Link from "next/link";

import {
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
} from "@/config/regions";
import { normalizeCountry } from "@/lib/route-helpers";

type Props = {
  cc?: string;
};

type FooterLink = {
  label: string;
  href: string;
};

const supportLinks: FooterLink[] = [
  { label: "مركز المساعدة", href: "/public/help" },
  { label: "الأسئلة الشائعة", href: "/public/faq" },
  { label: "التواصل", href: "/public/contact" },
];

const policyLinks: FooterLink[] = [
  { label: "الخصوصية", href: "/public/privacy" },
  { label: "الشروط", href: "/public/terms" },
  { label: "ملفات الارتباط", href: "/public/cookies" },
];

export function PublicFooter({ cc: ccProp }: Props) {
  const cc = normalizeCountry(ccProp ?? DEFAULT_COUNTRY);
  const countryLabel = SUPPORTED_COUNTRIES[cc]?.label ?? cc;
  const year = new Date().getFullYear();

  const browseLinks: FooterLink[] = [
    { label: "الصفحة الرئيسية", href: `/${cc}` },
    { label: "الجامعات", href: `/${cc}/university` },
    { label: "المدارس", href: `/${cc}/school` },
    { label: "الأكاديميات", href: `/${cc}/academy` },
  ];

  return (
    <footer className="border-t bg-card text-card-foreground" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/90 ring-1 ring-border/70 dark:bg-white/95">
                <Image
                  src="/brand/mustawak-icon-512.png"
                  alt=""
                  width={512}
                  height={512}
                  className="h-9 w-9 object-contain"
                  sizes="40px"
                  aria-hidden
                />
              </span>
              <div className="min-w-0 leading-tight">
                <div className="text-lg font-extrabold text-foreground">مستواك</div>
                <div className="text-xs font-semibold text-foreground/65">إصدار {countryLabel}</div>
              </div>
            </div>

            <p className="max-w-sm text-sm font-medium leading-7 text-foreground/70">
              منصة تعليمية للمراجعة والتدريب عبر اختبارات منظمة للجامعات والمدارس والأكاديميات، مع تجربة عربية واضحة
              ومناسبة للجوال والتابلت وسطح المكتب.
            </p>
          </div>

          <FooterLinkGroup title="التصفح" links={browseLinks} />
          <FooterLinkGroup title="الدعم" links={supportLinks} />

          <div className="space-y-4">
            <h3 className="text-base font-bold text-foreground">التواصل</h3>
            <p className="text-sm font-medium leading-7 text-foreground/70">
              قنوات التواصل الرسمية ستتوفر قريبًا عبر موقع{" "}
              <span dir="ltr" className="whitespace-nowrap">
                mustawak.com
              </span>
              . لا نعرض بريدًا أو رقمًا غير مفعل.
            </p>

            <p className="rounded-lg border bg-muted/30 p-3 text-sm font-medium leading-6 text-foreground/70">
              تابع هذه الصفحة لاحقًا لمعرفة وسائل الدعم المعتمدة وخيارات المتابعة الرسمية.
            </p>
          </div>
        </div>

        <div className="my-8 h-px bg-border" />

        <div className="flex flex-col gap-4 text-sm font-medium text-foreground/70 md:flex-row md:items-center md:justify-between">
          <p>© {year} مستواك. جميع الحقوق محفوظة.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="روابط السياسات">
            {policyLinks.map((link) => (
              <FooterLinkItem key={link.href} link={link} />
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}

function FooterLinkGroup({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <nav className="space-y-4" aria-label={title}>
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <div className="grid gap-2">
        {links.map((link) => (
          <FooterLinkItem key={link.href} link={link} />
        ))}
      </div>
    </nav>
  );
}

function FooterLinkItem({ link }: { link: FooterLink }) {
  return (
    <Link
      href={link.href}
      prefetch={false}
      className="inline-flex min-h-9 w-fit items-center rounded-md font-semibold text-foreground/75 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {link.label}
    </Link>
  );
}
