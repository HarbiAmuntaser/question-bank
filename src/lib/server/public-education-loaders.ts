import "server-only";

import { cache } from "react";

import { stripPrefix } from "@/lib/public/slug-utils";
import {
  getPublicUniversityByCode,
  getPublicUniversityBySlug,
  normalizePublicUniversityCode,
  normalizePublicUniversitySlug,
  type PublicUniversityDetails,
} from "@/lib/server/public-universities";
import {
  getPublicMajorByCode,
  getPublicMajorById,
  getPublicMajorBySlug,
  normalizePublicMajorCode,
  normalizePublicMajorSlug,
  type PublicMajorDetails,
} from "@/lib/server/public-majors";
import {
  getPublicSubjectByCode,
  getPublicSubjectById,
  getPublicSubjectBySlug,
  normalizePublicSubjectCode,
  normalizePublicSubjectId,
  normalizePublicSubjectSlug,
  toPublicSubjectDetails,
  type PublicSubjectDetails,
} from "@/lib/server/public-subjects";
import {
  getPublicQuizPreviewById,
  getPublicQuizPreviewBySlug,
  normalizePublicQuizSlug,
  type PublicQuizPreview,
} from "@/lib/server/public-quizzes";

export type { PublicUniversityDetails } from "@/lib/server/public-universities";

export type { PublicMajorDetails } from "@/lib/server/public-majors";

export type { PublicSubjectDetails } from "@/lib/server/public-subjects";

export type { PublicQuizPreview } from "@/lib/server/public-quizzes";

async function loadUniversityByRouteKey(routeKeyRaw: string): Promise<PublicUniversityDetails | null> {
  const routeKey = stripPrefix(routeKeyRaw, "جامعات");
  const normalizedSlug = normalizePublicUniversitySlug(routeKey.split("/"));
  const bySlug = await getPublicUniversityBySlug(normalizedSlug).catch(() => null);
  if (bySlug) return bySlug;

  if (!routeKey.includes("/")) {
    const normalizedCode = normalizePublicUniversityCode(routeKey);
    const byCode = await getPublicUniversityByCode(normalizedCode).catch(() => null);
    if (byCode) return byCode;
  }

  return null;
}

async function loadMajorByRouteKey(routeKeyRaw: string): Promise<PublicMajorDetails | null> {
  const routeKey = stripPrefix(routeKeyRaw, "تخصصات");
  const normalizedSlug = normalizePublicMajorSlug(routeKey.split("/"));
  const bySlug = await getPublicMajorBySlug(normalizedSlug).catch(() => null);
  if (bySlug) return bySlug;

  if (!routeKey.includes("/")) {
    const code = normalizePublicMajorCode(routeKey);
    const byCode = await getPublicMajorByCode(code).catch(() => null);
    if (byCode) return byCode;

    const byId = await getPublicMajorById(routeKey).catch(() => null);
    if (byId) return byId;
  }

  return null;
}

async function loadSubjectByRouteKey(routeKeyRaw: string): Promise<PublicSubjectDetails | null> {
  const routeKey = stripPrefix(routeKeyRaw, "مواد");
  const normalizedSlug = normalizePublicSubjectSlug(routeKey.split("/"));
  const bySlug = await getPublicSubjectBySlug(normalizedSlug).catch(() => null);
  if (bySlug) return toPublicSubjectDetails(bySlug);

  if (!routeKey.includes("/")) {
    const code = normalizePublicSubjectCode(routeKey);
    const byCode = await getPublicSubjectByCode(code).catch(() => null);
    if (byCode) return toPublicSubjectDetails(byCode);

    const id = normalizePublicSubjectId(routeKey);
    const byId = await getPublicSubjectById(id).catch(() => null);
    if (byId) return toPublicSubjectDetails(byId);
  }

  return null;
}

async function loadQuizPreviewByRouteKey(routeKeyRaw: string): Promise<PublicQuizPreview | null> {
  const routeKey = stripPrefix(routeKeyRaw, "اختبارات");
  const normalizedSlug = normalizePublicQuizSlug(routeKey.split("/"));
  const bySlug = await getPublicQuizPreviewBySlug(normalizedSlug).catch(() => null);
  if (bySlug) return bySlug;

  if (!routeKey.includes("/")) {
    const byId = await getPublicQuizPreviewById(routeKey).catch(() => null);
    if (byId) return byId;
  }

  return null;
}

export const getPublicUniversityByRouteKey = cache(loadUniversityByRouteKey);
export const getPublicMajorByRouteKey = cache(loadMajorByRouteKey);
export const getPublicSubjectByRouteKey = cache(loadSubjectByRouteKey);
export const getPublicQuizPreviewByRouteKey = cache(loadQuizPreviewByRouteKey);
