import Link from "next/link";
import { Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cardClass =
  "group flex h-full flex-col overflow-hidden border bg-card/95 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md dark:bg-gray-900/80";

export function PublicSubjectCard({
  href,
  name,
  description,
}: {
  href: string;
  name: string;
  description?: string | null;
}) {
  return (
    <Card className={cardClass}>
      <CardHeader className="pb-3">
        <CardTitle className="line-clamp-2 text-base font-semibold leading-snug transition-colors group-hover:text-primary sm:text-lg">
          {name}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col justify-between gap-4 pb-6 pt-0">
        {description ? <p className="line-clamp-2 text-sm leading-relaxed text-foreground/75">{description}</p> : null}

        <Button asChild className="h-11 w-full rounded-lg text-sm sm:text-base">
          <Link href={href} prefetch={false} className="flex items-center justify-center gap-2">
            <Trophy className="h-4 w-4" aria-hidden />
            فتح المادة
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
