// src/types/question.types.ts

import { Chapter } from "./chapter.types";
import { QuestionOption } from "./question-option.types";
import { User } from "./user.types";

export interface Question {
  id: string;
  chapterId: string;
  reviewSummaryId: string | null;
  reviewTopic: string | null;
  reviewPage: number | null;
  questionText: string;
  questionType: "multiple_choice" | "true_false" | "short_answer" | "essay";
  difficultyLevel: "easy" | "medium" | "hard";
  points: number;
  explanation: string | null;
  imageUrl: string | null;
  tags: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  chapter?: Chapter;
  reviewSummary?: {
    id: string;
    title: string;
    slug?: string;
    href?: string | null;
    hasPdf?: boolean;
  } | null;
  creator?: User;
  options?: QuestionOption[];
}
