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
  { label: "ظ…ط±ظƒط² ط§ظ„ظ…ط³ط§ط¹ط¯ط©", href: "/public/help" },
  { label: "ط§ظ„ط£ط³ط¦ظ„ط© ط§ظ„ط´ط§ط¦ط¹ط©", href: "/public/faq" },
  { label: "ط§ظ„طھظˆط§طµظ„", href: "/public/contact" },
];

const policyLinks: FooterLink[] = [
  { label: "ط§ظ„ط®طµظˆطµظٹط©", href: "/public/privacy" },
  { label: "ط§ظ„ط´ط±ظˆط·", href: "/public/terms" },
  { label: "ظ…ظ„ظپط§طھ ط§ظ„ط§ط±طھط¨ط§ط·", href: "/public/cookies" },
];

export function PublicFooter({ cc: ccProp }: Props) {
  const cc = normalizeCountry(ccProp ?? DEFAULT_COUNTRY);
  const countryLabel = SUPPORTED_COUNTRIES[cc]?.label ?? cc;
  const year = new Date().getFullYear();

  const browseLinks: FooterLink[] = [
    { label: "ط§ظ„طµظپط­ط© ط§ظ„ط±ط¦ظٹط³ظٹط©", href: `/${cc}` },
    { label: "ط§ظ„ط¬ط§ظ…ط¹ط§طھ", href: `/${cc}/university` },
    { label: "ط§ظ„ظ…ط¯ط§ط±ط³", href: `/${cc}/school` },
    { label: "ط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹط§طھ", href: `/${cc}/academy` },
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
                <div className="text-xs text-muted-foreground">ط¥طµط¯ط§ط± {countryLabel}</div>
              </div>
            </div>

            <p className="max-w-sm text-sm leading-7 text-muted-foreground">
              ظ…ظ†طµط© طھط¹ظ„ظٹظ…ظٹط© ظ„ظ„ظ…ط±ط§ط¬ط¹ط© ظˆط§ظ„طھط¯ط±ظٹط¨ ط¹ط¨ط± ط§ط®طھط¨ط§ط±ط§طھ ظ…ظ†ط¸ظ…ط© ظ„ظ„ط¬ط§ظ…ط¹ط§طھ ظˆط§ظ„ظ…ط¯ط§ط±ط³ ظˆط§ظ„ط£ظƒط§ط¯ظٹظ…ظٹط§طھطŒ ظ…ط¹ طھط¬ط±ط¨ط© ط¹ط±ط¨ظٹط© ظˆط§ط¶ط­ط©
              ظˆظ…ظ†ط§ط³ط¨ط© ظ„ظ„ط¬ظˆط§ظ„ ظˆط§ظ„طھط§ط¨ظ„طھ ظˆط³ط·ط­ ط§ظ„ظ…ظƒطھط¨.
            </p>
          </div>

          <FooterLinkGroup title="ط§ظ„طھطµظپط­" links={browseLinks} />
          <FooterLinkGroup title="ط§ظ„ط¯ط¹ظ…" links={supportLinks} />

          <div className="space-y-4">
            <h3 className="text-base font-semibold">ط§ظ„طھظˆط§طµظ„</h3>
            <p className="text-sm leading-7 text-muted-foreground">
              ظ‚ظ†ظˆط§طھ ط§ظ„طھظˆط§طµظ„ ط§ظ„ط±ط³ظ…ظٹط© ط³طھطھظˆظپط± ظ‚ط±ظٹط¨ط§ ط¹ط¨ط± ظ…ظˆظ‚ط¹{" "}
              <span dir="ltr" className="whitespace-nowrap">
                mustawak.com
              </span>
              . ظ„ط§ ظ†ط¹ط±ط¶ ط¨ط±ظٹط¯ط§ ط£ظˆ ط±ظ‚ظ…ط§ ط؛ظٹط± ظ…ظپط¹ظ„.
            </p>

            <p className="rounded-lg border bg-muted/30 p-3 text-sm leading-6 text-muted-foreground">
              طھط§ط¨ط¹ ظ‡ط°ظ‡ ط§ظ„طµظپط­ط© ظ„ط§ط­ظ‚ط§ ظ„ظ…ط¹ط±ظپط© ظˆط³ط§ط¦ظ„ ط§ظ„ط¯ط¹ظ… ط§ظ„ظ…ط¹طھظ…ط¯ط© ظˆط®ظٹط§ط±ط§طھ ط§ظ„ظ…طھط§ط¨ط¹ط© ط§ظ„ط±ط³ظ…ظٹط©.
            </p>
          </div>
        </div>

        <div className="my-8 h-px bg-border" />

        <div className="flex flex-col gap-4 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>آ© {year} ظ…ط³طھظˆط§ظƒ. ط¬ظ…ظٹط¹ ط§ظ„ط­ظ‚ظˆظ‚ ظ…ط­ظپظˆط¸ط©.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2" aria-label="ط±ظˆط§ط¨ط· ط§ظ„ط³ظٹط§ط³ط§طھ">
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
