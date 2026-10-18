import type { ReactNode } from "react";

import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header/public-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StaticPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  eyebrow?: string;
  meta?: string;
  width?: "narrow" | "article" | "wide";
};

const widthClassName = {
  narrow: "max-w-3xl",
  article: "max-w-4xl",
  wide: "max-w-5xl",
};

type StaticPageNavItem = {
  id: string;
  label: string;
};

export function StaticPageShell({
  title,
  description,
  children,
  eyebrow = "مستواك",
  meta,
  width = "article",
}: StaticPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 bg-background px-4 py-8 md:px-6 md:py-10"
      >
        <div className={cn("mx-auto min-w-0 w-full", widthClassName[width])}>
          <header className="mb-8 border-b px-1 pb-8 text-center sm:px-6">
            <p className="mx-auto mb-3 inline-flex min-h-8 items-center rounded-full border bg-muted/40 px-4 text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-bold tracking-normal text-foreground sm:text-4xl md:text-5xl">{title}</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{description}</p>
            {meta ? (
              <p className="mx-auto mt-4 inline-flex rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
                {meta}
              </p>
            ) : null}
          </header>

          <div className="space-y-6">{children}</div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}

export function StaticArticleCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <article
      className={cn(
        "prose max-w-none border-y border-border/70 py-6 text-right leading-8 dark:prose-invert sm:px-3 sm:py-8",
        "prose-headings:font-bold prose-headings:text-foreground prose-h2:scroll-mt-24 prose-h2:mt-10 prose-h2:border-b prose-h2:border-border prose-h2:pb-3",
        "prose-a:font-semibold prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:underline",
        "prose-p:leading-8 prose-li:leading-8 prose-ul:my-5",
        className,
      )}
    >
      {children}
    </article>
  );
}

export function StaticPageNav({ items }: { items: StaticPageNavItem[] }) {
  return (
    <nav aria-label="محتويات الصفحة" className="border-y bg-muted/20 px-4 py-4 sm:px-6">
      <p className="mb-3 text-sm font-bold text-foreground">في هذه الصفحة</p>
      <div className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="min-w-0 break-words text-sm font-semibold leading-7 text-foreground/75 underline-offset-4 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export function StaticNotice({ children }: { children: ReactNode }) {
  return (
    <aside className="min-w-0 break-words border-r-4 border-primary bg-primary/5 px-4 py-3 text-sm font-medium leading-7 text-foreground/85">
      {children}
    </aside>
  );
}

export function StaticSectionCard({
  title,
  description,
  children,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("border-border/70 shadow-sm", className)}>
      <CardHeader className="border-b bg-muted/20 p-5 sm:p-6">
        <CardTitle className="text-xl font-bold leading-8 sm:text-2xl">{title}</CardTitle>
        {description ? <CardDescription className="leading-7">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className={cn("p-5 sm:p-6", contentClassName)}>{children}</CardContent>
    </Card>
  );
}
