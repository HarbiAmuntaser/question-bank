// file: src/components/public/university-grid/types.ts

export type InstType = "university" | "school" | "academy";

export type UniversitySeoLite = {
  slug?: string | null;
};

export type UniversityGridItem = {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
  city?: string | null;
  region?: string | null;
  seo?: UniversitySeoLite | null;
  seoSlug?: string | null; // لو API قديم يرجع seoSlug
  _count: {
    majors: number;
    quizzes?: number;
  };
};
