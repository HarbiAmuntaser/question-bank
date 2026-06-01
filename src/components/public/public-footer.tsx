import type { ReactNode } from "react";
import Link from "next/link";
import { GraduationCap, Mail, MapPin, Phone } from "lucide-react";

import {
  DEFAULT_COUNTRY,
  SUPPORTED_COUNTRIES,
  type CountryCode,
} from "@/config/regions";
import { normalizeCountry } from "@/lib/route-helpers";

type Props = {
  cc?: string;
};

type FooterLink = {
  label: string;
  href: string;
};

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

const supportLinks: FooterLink[] = [
  { label: "مركز المساعدة", href: "/public/help" },
  { label: "الأسئلة الشائعة", href: "/public/faq" },
  { label: "تواصل معنا", href: "/public/contact" },
];

const policyLinks: FooterLink[] = [
  { label: "الخصوصية", href: "/public/privacy" },
  { label: "الشروط", href: "/public/terms" },
  { label: "ملفات تعريف الارتباط", href: "/public/cookies" },
];

export function PublicFooter({ cc: ccProp }: Props) {
  const cc = normalizeCountry(ccProp ?? DEFAULT_COUNTRY);
  const countryLabel = SUPPORTED_COUNTRIES[cc]?.label ?? cc;
  const contact = CONTACT_BY_COUNTRY[cc];
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
            <div className="flex items-center gap-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
                aria-hidden
              >
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="min-w-0 leading-tight">
                <div className="text-lg font-bold">بنك الأسئلة</div>
                <div className="text-xs text-muted-foreground">إصدار {countryLabel}</div>
              </div>
            </div>

            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              منصة تعليمية للمراجعة والتدريب عبر أسئلة واختبارات منظمة للطلاب، مع محتوى مخصص
              حسب الدولة ونوع المؤسسة.
            </p>
          </div>

          <FooterLinkGroup title="التصفح" links={browseLinks} />
          <FooterLinkGroup title="الدعم" links={supportLinks} />

          <div className="space-y-4">
            <h3 className="text-base font-semibold">التواصل</h3>
            <div className="space-y-3">
              <ContactItem icon={<Mail className="h-4 w-4" aria-hidden />}>
                <span dir="ltr" className="text-left">
                  {contact.email}
                </span>
              </ContactItem>
              <ContactItem icon={<Phone className="h-4 w-4" aria-hidden />}>
                <span dir="ltr" className="text-left">
                  {contact.phone}
                </span>
              </ContactItem>
              <ContactItem icon={<MapPin className="h-4 w-4" aria-hidden />}>
                <span>{contact.location}</span>
              </ContactItem>
            </div>

            <p className="rounded-lg border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
              التنبيهات التعليمية وخيارات المتابعة ستكون متاحة قريبًا.
            </p>
          </div>
        </div>

        <div className="my-8 h-px bg-border" />

        <div className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {year} بنك الأسئلة. جميع الحقوق محفوظة.</p>
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
      <h3 className="text-base font-semibold">{title}</h3>
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
      className="inline-flex min-h-9 w-fit items-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {link.label}
    </Link>
  );
}

function ContactItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </div>
  );
}
