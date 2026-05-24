// src/types/question.types.ts

import { Chapter } from "./chapter.types";
import { QuestionOption } from "./question-option.types";
import { User } from "./user.types";

export interface Question {
  id: string;
  chapterId: string;
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
  creator?: User;
  options?: QuestionOption[];
}