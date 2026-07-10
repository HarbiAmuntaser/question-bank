export type BlogTaxonomyKind = "topic" | "tag";
export type BlogAdminPaginationKind = BlogTaxonomyKind | "post";

export type BlogTaxonomyRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  postsCount: number;
};

export type BlogTaxonomyPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type BlogTaxonomyListResponse = {
  data: BlogTaxonomyRow[];
  pagination: BlogTaxonomyPagination;
};

export type BlogPostStatus = "draft" | "published" | "archived";
export type BlogVisibility = "global" | "countries";
export type BlogCountryCode = "SA" | "YE";

export type BlogPostTopicOption = {
  id: string;
  name: string;
  slug: string;
};

export type BlogPostTagOption = {
  id: string;
  name: string;
  slug: string;
};

export type BlogPostRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  status: BlogPostStatus;
  visibility: BlogVisibility;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  readingMinutes: number | null;
  featured: boolean;
  sortOrder: number;
  contentHtml: string | null;
  contentText: string | null;
  coverAttachmentId: string | null;
  coverAttachment: { id: string; url: string | null; title: string | null } | null;
  primaryTopic: BlogPostTopicOption;
  tags: BlogPostTagOption[];
  countries: BlogCountryCode[];
};

export type BlogPostListResponse = {
  data: BlogPostRow[];
  pagination: BlogTaxonomyPagination;
};
