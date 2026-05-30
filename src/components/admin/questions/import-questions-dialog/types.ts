export type DifficultyLevel = "easy" | "medium" | "hard";
export type ImportQuestionType = "multiple_choice" | "true_false";
export type DuplicateStrategy = "allow" | "skip" | "fail";

export type NormalizedOption = {
  text: string;
  isCorrect: boolean;
};

export type NormalizedImportItem = {
  sourceIndex: number;
  questionText: string;
  questionType: ImportQuestionType;
  difficultyLevel: DifficultyLevel;
  points: number;
  explanation?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  isActive?: boolean;
  options?: NormalizedOption[];
  tfAnswer?: boolean;
};

export type ImportIssue = {
  index?: number;
  message: string;
};

export type ImportPreview = {
  sourceText: string;
  items: NormalizedImportItem[];
  errors: ImportIssue[];
  warnings: ImportIssue[];
  summary: {
    total: number;
    multipleChoice: number;
    trueFalse: number;
    easy: number;
    medium: number;
    hard: number;
    withExplanation: number;
    withTags: number;
    withImage: number;
    duplicateInFile: number;
    totalPoints: number;
  };
};

export type ImportProgressState = {
  status: "idle" | "running" | "success" | "error";
  total: number;
  imported: number;
  skipped: number;
  currentBatch: number;
  totalBatches: number;
  failedBatch?: number;
  message?: string;
};
