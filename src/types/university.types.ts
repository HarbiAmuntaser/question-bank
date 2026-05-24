// src/types/university.types.ts

export interface University {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
}