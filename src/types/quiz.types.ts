import { Major, University, Subject, Chapter, Question, QuestionOption, Quiz } from "@prisma/client";

export interface QuizWithDetails extends Quiz {
  university?: University;
  major?: Major & {
    university?: University;
    subjects?: Subject[];
  };
  subject?: Subject;
  chapter?: Chapter & {
    subject?: Subject & {
      major?: Major;
    };
  };
  questions: Array<Question & {
    options?: QuestionOption[];
  }>;
  _count: {
    questions: number;
  };
}