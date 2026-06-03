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
      <main className="flex-1 bg-gradient-to-b from-background via-background to-muted/20 px-4 py-8 md:px-6 md:py-10">
        <div className={cn("mx-auto w-full", widthClassName[width])}>
          <header className="mb-7 rounded-2xl border bg-card/85 px-5 py-7 text-center shadow-sm sm:px-8 sm:py-8">
            <p className="mx-auto mb-3 inline-flex min-h-8 items-center rounded-full border bg-muted/40 px-4 text-sm font-medium text-muted-foreground">
              {eyebrow}
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">{title}</h1>
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
    <Card className="border-border/70 shadow-sm">
      <CardContent
        className={cn(
          "prose max-w-none p-5 text-right leading-8 dark:prose-invert sm:p-8",
          "prose-headings:font-bold prose-headings:text-foreground prose-h2:mt-9 prose-h2:border-b prose-h2:border-border prose-h2:pb-3",
          "prose-p:leading-8 prose-li:leading-8 prose-ul:my-5",
          className,
        )}
      >
        {children}
      </CardContent>
    </Card>
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
