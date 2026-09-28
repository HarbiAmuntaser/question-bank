import type { CollegePublicLite, MajorPublicLite } from "@/types/public-university";

export type CollegeMajorGroup = {
  key: string;
  label: string;
  college: CollegePublicLite | null;
  majors: MajorPublicLite[];
};

export function buildCollegeMajorGroups(
  colleges: CollegePublicLite[],
  majors: MajorPublicLite[],
): { collegeGroups: CollegeMajorGroup[]; universityMajors: MajorPublicLite[] } {
  const activeCollegeIds = new Set(colleges.map((college) => college.id));
  const collegeGroups = colleges.map((college) => ({
    key: college.slug,
    label: college.name,
    college,
    majors: majors.filter((major) => major.collegeId === college.id),
  }));
  const universityMajors = majors.filter(
    (major) => !major.collegeId || !activeCollegeIds.has(major.collegeId),
  );

  return { collegeGroups, universityMajors };
}
