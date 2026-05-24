// src/types/question-option.types.ts

import { Question } from "./question.types";

export interface QuestionOption {
  id: string;
  questionId: string;
  optionText: string;
  isCorrect: boolean;
  optionOrder: number | null;
  createdAt: Date;

  // Relations
  question?: Question;
}