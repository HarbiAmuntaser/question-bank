export interface University {
  id: string
  name: string
  code: string | null
  city: string | null
  region: string | null
  logoUrl: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface CreateUniversityData {
  name: string
  code?: string
  city?: string
  region?: string
  logoUrl?: string
  isActive: boolean
}

export type UpdateUniversityData = CreateUniversityData

export interface Major {
  id: string
  universityId: string
  name: string
  code: string | null
  degreeType: string | null
  durationYears: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Major types
export interface MajorWithRelations extends Major {
  university: University
  _count: {
    subjects: number
  }
}

export interface CreateMajorData {
  universityId: string
  name: string
  code?: string
  degreeType?: string
  durationYears?: number
  isActive: boolean
}

export type UpdateMajorData = CreateMajorData

// Subject types
export interface SubjectWithRelations extends Subject {
  major: MajorWithRelations
  _count: {
    chapters: number
  }
}

export interface CreateSubjectData {
  majorId: string
  name: string
  code?: string
  creditHours?: number
  semester?: number
  year?: number
  description?: string
  isActive: boolean
}

export type UpdateSubjectData = CreateSubjectData

export interface Subject {
  id: string
  majorId: string
  name: string
  code: string | null
  creditHours: number | null
  semester: number | null
  year: number | null
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Chapter types
export interface ChapterWithRelations extends Chapter {
  subject: SubjectWithRelations
  _count: {
    questions: number
  }
}

export interface CreateChapterData {
  subjectId: string
  name: string
  chapterNumber?: number
  description?: string
  learningObjectives?: string[]
  isActive: boolean
}

export type UpdateChapterData = CreateChapterData

export interface Chapter {
  id: string
  subjectId: string
  name: string
  chapterNumber: number | null
  description: string | null
  learningObjectives: string[] | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// Question types
export interface QuestionWithRelations extends Question {
  chapter: ChapterWithRelations
  options: QuestionOption[]
}

export interface QuestionWithOptions extends Question {
  options: QuestionOption[]
}

export interface CreateQuestionData {
  chapterId: string
  questionText: string
  questionType: "multiple_choice" | "true_false" | "short_answer" | "essay"
  difficultyLevel: "easy" | "medium" | "hard"
  points: number
  explanation?: string
  imageUrl?: string
  tags?: string[]
  isActive: boolean
  options?: {
    optionText: string
    isCorrect: boolean
    optionOrder: number
  }[]
}

export type UpdateQuestionData = CreateQuestionData

export interface Question {
  id: string
  chapterId: string
  questionText: string
  questionType: "multiple_choice" | "true_false" | "short_answer" | "essay"
  difficultyLevel: "easy" | "medium" | "hard"
  points: number
  explanation: string | null
  imageUrl: string | null
  tags: string[]
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface QuestionOption {
  id: string
  questionId: string
  optionText: string
  isCorrect: boolean
  optionOrder: number | null
  createdAt: Date
}

// Quiz types
export interface Quiz {
  id: string
  title: string
  description: string | null
  timeLimit: number
  totalPoints: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithOptions[]
}

// Quiz session and answer types
export interface QuizAnswer {
  questionId: string
  selectedOptionIds?: string[]
  textAnswer?: string
  booleanAnswer?: boolean
  answeredAt: Date
}

export interface QuizSession {
  id: string
  quizId: string
  startTime: Date
  endTime?: Date
  answers: Record<string, QuizAnswer>
  isCompleted: boolean
}

export interface QuizResult {
  sessionId: string
  quizId: string
  correctAnswers: number
  totalQuestions: number
  earnedPoints: number
  totalPoints: number
  percentage: number
  duration: number
  grade: string
  completedAt: Date
}

// أضف هذه الأنواع الجديدة
export interface QuizQuestion {
  id: string;
  quizId: string;
  questionId: string;
  questionOrder: number;
  points: number;
  question: QuestionWithOptions;
}

export interface QuizWithQuestions extends Quiz {
  questions: QuestionWithOptions[];
}

export interface QuestionWithOptions extends Question {
  options: QuestionOption[];
}

////-----
// أضف هذه الأنواع الجديدة تحت أنواع Quiz الموجودة


export interface UniversityWithStats extends University {
  _count: {
    majors: number;
    quizzes: number;
  };
  majors: (Major & {
    _count: {
      subjects: number;
      quizzes: number;
    };
  })[];
}

// أضف نوع فلترات البحث
export interface QuizFilters {
  universityId?: string;
  majorId?: string;
  subjectId?: string;
  difficulty?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

// أنواع إحصاءات المنصة
export interface PlatformStats {
  totalQuizzes: number;
  totalQuestions: number;
  totalUniversities: number;
  totalSubjects: number;
}

// أنواع إضافية للعلاقات
export interface QuizWithChapter extends Quiz {
  chapter: {
    subject: {
      major: {
        university: University;
      };
    };
  };
}



//هذه من اجل عرض الجامعه مع التخصصات للمدير 
export interface QuizWithDetails {
  id: string
  title: string
  description: string | null
  timeLimit: number
  totalQuestions: number
  totalPoints: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  universityId: string | null
  majorId: string | null
  chapterId: string | null
  subjectId: string | null
  // Relations
  University?: University
  Major?: Major & { university?: University }
  Chapter?: Chapter & {
    subject?: Subject & { major?: Major }
  }
  subject?: Subject & {
    major?: Major & { university?: University }
  }
  questions: Question[]
  _count: {
    questions: number
  }
}
