// src/types/subject.types.ts

import { Major } from "./major.types"

export interface Subject {
  id: string
  name: string
  code: string | null
  creditHours: number | null
  semester: number | null
  year: number | null
  description: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  majorId: string
  // Relations
  major?: Major
}