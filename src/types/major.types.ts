// src/types/major.types.ts

import { University } from "./university.types"

export interface Major {
  id: string
  name: string
  code: string | null
  degreeType: string | null
  durationYears: number | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  createdBy: string | null
  universityId: string
  // Relations
  university?: University
}