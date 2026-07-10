"use client";

/**
 * UniversityGrid
 * - يجلب المؤسسات حسب cc/type (+بحث q) من API الطالب
 * - يدعم إخفاء البحث وإخفاء زر "عرض الكل" حسب مكان الاستخدام
 */

import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import Image from "next/image";
import { Search, Users, BookOpen, Trophy, GraduationCap, Star } from "lucide-react";
import { motion } from "framer-motion";
import type { UniversityWithStats } from "@/types/student";
import { studentGet } from "@/lib/student-client";
import { getUniversityGridTexts } from "@/content/university-grid";

type InstType = "university" | "school" | "academy";

export function UniversityGrid({
  cc,
  type,
  lang, // اختياري
  showSearch = true,
  showViewAll = false, // ✅ افتراضيًا لا نعرضه (لأن صفحة /{cc}/{type} هي صفحة الكل)
}: {
  cc: string;
  type: InstType;
  lang?: string;
  showSearch?: boolean;
  showViewAll?: boolean;
}) {
  const ccNorm = (cc || "SA").toUpperCase();
  const typeNorm = (type || "university").toLowerCase() as InstType;

  const [universities, setUniversities] = useState<UniversityWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const ui = getUniversityGridTexts(ccNorm, typeNorm);

  useEffect(() => {
    const ac = new AbortController();
    let active = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          limit: "1000",
          withMajors: "1",
          cc: ccNorm,
          type: typeNorm,
        });

        const q = deferredQuery.trim();
        if (q) params.set("q", q);

        const data = await studentGet<UniversityWithStats[]>(
          `/api/v1/student/universities?${params.toString()}`,
          undefined,
          ac.signal
        );

        if (!active || ac.signal.aborted) return;
        setUniversities(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (e?.name === "AbortError" || msg.includes("aborted")) return;
        if (!active || ac.signal.aborted) return;

        setError(e?.message || "فشل تحميل المؤسسات");
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      ac.abort();
    };
  }, [ccNorm, typeNorm, deferredQuery]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return universities;
    return universities.filter(
      (u) => u.name.toLowerCase().includes(q) || (u.code ?? "").toLowerCase().includes(q)
    );
  }, [universities, deferredQuery]);

  const base = `/${ccNorm}/${typeNorm}`;

  function makeUniversityHref(u: UniversityWithStats) {
    const seoSlug = (u as any)?.seo?.slug ?? (u as any)?.seoSlug ?? null;
    const raw = (seoSlug || u.code || u.id || "").toString();
    const cleaned = raw.replace(/^\/+/, "").replace(/\/+$/, "").replace(/^جامعات\//, "");
    return `${base}/universities/${encodeURI(cleaned)}`;
  }

  if (loading) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-lg border-2 bg-card/95 shadow-lg">
              <div className="h-44 animate-pulse bg-muted sm:h-48" />
              <div className="space-y-5 p-6">
                <div className="h-6 w-4/5 animate-pulse rounded bg-muted" />
                <div className="h-11 w-full animate-pulse rounded-xl bg-muted sm:h-12" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center rounded-2xl p-6 bg-red-50 dark:bg-red-900/20 border border-red-200/60 dark:border-red-800/50">
          <p className="text-red-700 dark:text-red-300 font-medium">{error}</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className="bg-background px-4 py-16 sm:px-6 lg:px-8"
      aria-labelledby="universities-heading"
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="rounded-2xl bg-[image:var(--gradient-primary)] p-3 shadow-lg" aria-hidden>
              <GraduationCap className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 id="universities-heading" className="text-4xl font-bold text-foreground">
              {ui.heading}
            </h2>
          </div>
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-muted-foreground">{ui.subheading}</p>
        </motion.div>

        {/* Search (اختياري) */}
        {showSearch && (
          <motion.form
            role="search"
            aria-label="البحث"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-2xl mx-auto mb-12"
            onSubmit={(e) => e.preventDefault()}
          >
            <div className="relative">
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <label htmlFor="universities-search" className="sr-only">
                {ui.searchLabel}
              </label>
              <Input
                id="universities-search"
                placeholder={ui.searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-14 rounded-2xl border-2 border-border bg-background/80 pr-12 text-lg shadow-lg backdrop-blur-sm focus:border-primary"
                inputMode="search"
              />
            </div>
          </motion.form>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 xl:gap-8" aria-live="polite">
          {filtered.map((u, index) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index }}
              whileHover={{ y: -4 }}
              className="group"
            >
              <Card className="flex h-full flex-col overflow-hidden border-2 bg-card/95 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-xl">
                <div className="relative h-48 overflow-hidden">
                  <div className="absolute inset-0 bg-[image:var(--gradient-primary)] opacity-20" aria-hidden />
                  <Image
                    src="/images/institutions/default.svg"
                    alt={u.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-background/90 text-foreground shadow-lg" aria-label={ui.badgeAria}>
                      <Star className="ml-1 h-3 w-3 text-[hsl(var(--brand-amber))]" aria-hidden />
                      {ui.badgeText}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-bold text-foreground transition-colors group-hover:text-primary">
                    {u.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-xl bg-primary/5 p-3 text-center dark:bg-primary/10">
                      <BookOpen className="mx-auto mb-1 h-5 w-5 text-primary" aria-hidden />
                      <div className="text-lg font-bold text-primary">{u._count.majors}</div>
                      <p className="text-xs text-foreground/70">{ui.statMajors}</p>
                    </div>
                    <div className="rounded-xl bg-[hsl(var(--brand-emerald)_/_0.08)] p-3 text-center dark:bg-[hsl(var(--brand-emerald)_/_0.12)]">
                      <Trophy className="mx-auto mb-1 h-5 w-5 text-[hsl(var(--brand-emerald))]" aria-hidden />
                      <div className="text-lg font-bold text-[hsl(var(--brand-emerald))]">{u._count.quizzes ?? 0}</div>
                      <p className="text-xs text-foreground/70">{ui.statQuizzes}</p>
                    </div>
                    <div className="rounded-xl bg-[hsl(var(--brand-cyan)_/_0.08)] p-3 text-center dark:bg-[hsl(var(--brand-cyan)_/_0.12)]">
                      <Users className="mx-auto mb-1 h-5 w-5 text-[hsl(var(--brand-cyan))]" aria-hidden />
                      <div className="text-lg font-bold text-[hsl(var(--brand-cyan))]">
                        {Array.isArray((u as any).majors)
                          ? (u as any).majors.reduce((sum: number, m: any) => sum + (m?._count?.subjects ?? 0), 0)
                          : 0}
                      </div>
                      <p className="text-xs text-foreground/70">{ui.statSubjects}</p>
                    </div>
                  </div>

                  <Button
                    asChild
                    className="h-12 w-full rounded-xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-lg transition-all duration-300 hover:opacity-95 group-hover:shadow-xl"
                  >
                    <Link href={makeUniversityHref(u)} prefetch className="flex items-center justify-center gap-2">
                      <GraduationCap className="h-5 w-5" aria-hidden />
                      {ui.ctaExplore}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {filtered.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <div className="mx-auto max-w-md rounded-2xl bg-muted/40 p-6">
              <Search className="mx-auto mb-4 h-16 w-16 text-muted-foreground" aria-hidden />
              <h3 className="mb-2 text-xl font-semibold text-foreground">{ui.noResultsTitle}</h3>
              <p className="text-muted-foreground">{ui.noResultsText}</p>
            </div>
          </motion.div>
        )}

        {/* ✅ اختياري فقط لو احتجته لاحقًا في صفحة أخرى */}
        {showViewAll && universities.length > 6 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-center mt-12">
            <Button asChild size="lg" variant="outline" className="h-14 rounded-xl border-2 bg-background/80 px-8 text-lg shadow-lg backdrop-blur-sm hover:bg-muted/50">
              <Link href={base} prefetch>
                {ui.viewAll} ({universities.length})
              </Link>
            </Button>
          </motion.div>
        )}
      </div>
    </section>
  );
}
