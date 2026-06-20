"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getRequestOrigin } from "@/lib/server/request-origin";

type BlogTaxonomyPayload = {
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
};

type BlogPostPayload = {
  title: string;
  slug: string;
  excerpt: string | null;
  primaryTopicId: string;
  tagIds: string[];
  status: "draft" | "published" | "archived";
  publishedAt?: string;
  visibility: "global" | "countries";
  countries: string[];
  contentHtml: string | null;
  contentText: string | null;
  readingMinutes?: number;
  featured: boolean;
  sortOrder: number;
  coverAttachmentId: string | null;
};

type ActionResult = {
  success: boolean;
  message: string;
};

const ADMIN_BLOG_PATH = "/admin/blog";
const ADMIN_BLOG_TOPICS_PATH = "/admin/blog/topics";
const ADMIN_BLOG_TAGS_PATH = "/admin/blog/tags";

function adminHeaders(): HeadersInit {
  return {
    "content-type": "application/json",
    ...(process.env.ADMIN_API_KEY ? { "x-admin-key": process.env.ADMIN_API_KEY } : {}),
  };
}

function normalize(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function nullable(value: string) {
  return value.length ? value : null;
}

function optionalNumber(value: string) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function formPayload(formData: FormData): BlogTaxonomyPayload {
  const description = normalize(formData.get("description"));
  const isActive = normalize(formData.get("isActive")).toLowerCase();

  return {
    name: normalize(formData.get("name")),
    slug: normalize(formData.get("slug")).toLowerCase(),
    description: description || null,
    isActive: ["true", "on", "1"].includes(isActive),
  };
}

function postPayload(formData: FormData): BlogPostPayload {
  const status = normalize(formData.get("status"));
  const visibility = normalize(formData.get("visibility")) === "countries" ? "countries" : "global";
  const tagIds = formData
    .getAll("tagIds")
    .map((value) => normalize(value))
    .filter(Boolean);

  return {
    title: normalize(formData.get("title")),
    slug: normalize(formData.get("slug")).toLowerCase(),
    excerpt: nullable(normalize(formData.get("excerpt"))),
    primaryTopicId: normalize(formData.get("primaryTopicId")),
    tagIds,
    status: status === "published" || status === "archived" ? status : "draft",
    publishedAt: normalize(formData.get("publishedAt")) || undefined,
    visibility,
    countries:
      visibility === "countries"
        ? formData
            .getAll("countries")
            .map((value) => normalize(value))
            .filter(Boolean)
        : [],
    contentHtml: nullable(normalize(formData.get("contentHtml"))),
    contentText: nullable(normalize(formData.get("contentText"))),
    readingMinutes: optionalNumber(normalize(formData.get("readingMinutes"))),
    featured: ["true", "on", "1"].includes(normalize(formData.get("featured")).toLowerCase()),
    sortOrder: optionalNumber(normalize(formData.get("sortOrder"))) ?? 0,
    coverAttachmentId: nullable(normalize(formData.get("coverAttachmentId"))),
  };
}

async function readErrorMessage(res: Response, fallback: string) {
  const text = await res.text().catch(() => "");
  if (!text) return fallback;

  try {
    const payload: unknown = JSON.parse(text);
    if (payload && typeof payload === "object" && "error" in payload) {
      return String((payload as { error: unknown }).error);
    }
  } catch {
    return text;
  }

  return fallback;
}

async function sendJson(path: string, method: "POST" | "PUT" | "PATCH" | "DELETE", body?: unknown) {
  const base = await getRequestOrigin();
  const jar = await cookies();
  const requestHeaders = new Headers(adminHeaders());
  const cookieHeader = jar.toString();
  if (cookieHeader) requestHeaders.set("cookie", cookieHeader);

  return fetch(`${base}${path}`, {
    method,
    headers: requestHeaders,
    cache: "no-store",
    body: body ? JSON.stringify(body) : undefined,
  });
}

function revalidateBlogAdmin() {
  revalidatePath(ADMIN_BLOG_PATH);
  revalidatePath(ADMIN_BLOG_TOPICS_PATH);
  revalidatePath(ADMIN_BLOG_TAGS_PATH);
}

function success(message: string): ActionResult {
  revalidateBlogAdmin();
  return { success: true, message };
}

export async function createBlogTopicAction(formData: FormData): Promise<ActionResult> {
  const res = await sendJson("/api/v1/admin/blog/topics", "POST", formPayload(formData));
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل إنشاء الموضوع") };
  }
  return success("تم إنشاء الموضوع بنجاح");
}

export async function updateBlogTopicAction(id: string, formData: FormData): Promise<ActionResult> {
  const res = await sendJson(`/api/v1/admin/blog/topics/${id}`, "PUT", formPayload(formData));
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل تحديث الموضوع") };
  }
  return success("تم تحديث الموضوع بنجاح");
}

export async function disableBlogTopicAction(id: string): Promise<ActionResult> {
  const res = await sendJson(`/api/v1/admin/blog/topics/${id}`, "DELETE");
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل تعطيل الموضوع") };
  }
  return success("تم تعطيل الموضوع بنجاح");
}

export async function createBlogTagAction(formData: FormData): Promise<ActionResult> {
  const res = await sendJson("/api/v1/admin/blog/tags", "POST", formPayload(formData));
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل إنشاء الوسم") };
  }
  return success("تم إنشاء الوسم بنجاح");
}

export async function updateBlogTagAction(id: string, formData: FormData): Promise<ActionResult> {
  const res = await sendJson(`/api/v1/admin/blog/tags/${id}`, "PUT", formPayload(formData));
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل تحديث الوسم") };
  }
  return success("تم تحديث الوسم بنجاح");
}

export async function disableBlogTagAction(id: string): Promise<ActionResult> {
  const res = await sendJson(`/api/v1/admin/blog/tags/${id}`, "DELETE");
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل تعطيل الوسم") };
  }
  return success("تم تعطيل الوسم بنجاح");
}

export async function createBlogPostAction(formData: FormData): Promise<ActionResult> {
  const res = await sendJson("/api/v1/admin/blog/posts", "POST", postPayload(formData));
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل إنشاء المقال") };
  }
  return success("تم إنشاء المقال بنجاح");
}

export async function updateBlogPostAction(id: string, formData: FormData): Promise<ActionResult> {
  const res = await sendJson(`/api/v1/admin/blog/posts/${id}`, "PATCH", postPayload(formData));
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل تحديث المقال") };
  }
  return success("تم تحديث المقال بنجاح");
}

export async function archiveBlogPostAction(id: string): Promise<ActionResult> {
  const res = await sendJson(`/api/v1/admin/blog/posts/${id}`, "PATCH", { status: "archived" });
  if (!res.ok) {
    return { success: false, message: await readErrorMessage(res, "فشل أرشفة المقال") };
  }
  return success("تم أرشفة المقال بنجاح");
}
