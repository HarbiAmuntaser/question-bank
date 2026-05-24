export interface SubjectCountLite { subjects: number }
export interface MajorLite {
  id: string;
  name: string;
  code: string | null;
  _count: SubjectCountLite;
}
// جزء مقتبس/مقترح لنوع UniversityWithStats المستخدم في الواجهة
export type UniversityWithStats = {
  id: string;
  name: string;
  code: string | null;
  logoUrl: string | null;
  isActive: boolean;
  countryCode: string | null; // ✅ جديد
  institutionType: "university" | "school" | "academy" | null; // ✅ جديد
  majors: Array<{
    id: string;
    name: string;
    _count?: { subjects: number };
  }>;
  _count: {
    majors: number;
    quizzes?: number; // قد لا تكون موجودة — سنعمل لها fallback
  };
};


export interface PlatformStats {
  totalQuizzes: number;
  totalQuestions: number;
  totalUniversities: number;
  totalSubjects: number;
}