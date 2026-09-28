import { ContextBackLink } from "@/components/public/context-back-link";
import { MajorsList } from "@/components/public/majors-list";
import type { PublicCollegeDetails } from "@/lib/server/public-colleges";

export function CollegeDetails({ college, cc, universitySlug, universityHref }: {
  college: PublicCollegeDetails;
  cc: string;
  universitySlug: string;
  universityHref: string;
}) {
  return (
    <div className="space-y-8">
      <ContextBackLink href={universityHref} label={college.university.name} />
      <header className="border-b border-border/70 pb-7 pt-2 sm:pb-9">
        <p className="text-sm font-medium text-primary">{college.university.name}</p>
        <h1 className="mt-2 text-3xl font-bold leading-tight text-foreground sm:text-4xl">{college.name}</h1>
      </header>
      <section id="majors-section" className="space-y-5" aria-labelledby="college-majors-title">
        <h2 id="college-majors-title" className="text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          التخصصات
        </h2>
        <MajorsList cc={cc} type="university" universitySlug={universitySlug} majors={college.majors} />
      </section>
    </div>
  );
}
