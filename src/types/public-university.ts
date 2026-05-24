// file: src/types/public-university.ts

export type SeoLite = { slug: string | null };

export type MajorPublicLite = {
  id: string;
  name: string;
  code: string | null;
  degreeType: string | null;
  durationYears: number | null;
  seo?: SeoLite | null;
  _count: { subjects: number };
};

export type UniversityPublicLite = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  createdAt?: string | Date; // بعض APIs ترجع string
  majors?: MajorPublicLite[];
  seo?: SeoLite | null;
  countryCode?: string | null;
  institutionType?: "university" | "school" | "academy" | null;
};
