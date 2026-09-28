// file: src/types/public-university.ts

export type SeoLite = { slug: string | null };

export type CollegePublicLite = {
  id: string;
  name: string;
  slug: string;
  code: string | null;
};

export type MajorPublicLite = {
  id: string;
  name: string;
  code: string | null;
  collegeId: string | null;
  college?: CollegePublicLite | null;
  degreeType: string | null;
  durationYears: number | null;
  seo?: SeoLite | null;
  _count?: { subjects: number };
};

export type UniversityPublicLite = {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  createdAt?: string | Date; // بعض APIs ترجع string
  colleges?: CollegePublicLite[];
  majors?: MajorPublicLite[];
  seo?: SeoLite | null;
  countryCode?: string | null;
  institutionType?: "university" | "school" | "academy" | null;
  visibility?: "country" | "global" | null;
};
