// src/types/chapter.types.ts

import { Subject } from "./subject.types";
import { User } from "./user.types";

export interface Chapter {
  id: string;
  subjectId: string;
  name: string;
  chapterNumber: number | null;
  description: string | null;
  learningObjectives: string[];
  isActive: boolean;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Relations
  subject?: Subject;
  creator?: User;
}