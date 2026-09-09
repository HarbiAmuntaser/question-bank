export const ADMIN_ROLES = ["admin", "editor", "moderator"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const CONTENT_RESOURCES = [
  "universities", "majors", "subjects", "chapters", "summaries",
  "questions", "quizzes", "blog", "seo-meta", "attachments", "lookups",
] as const;

export type AdminPermission =
  | "dashboard:read"
  | "analytics:read"
  | "users:manage"
  | "subscriptions:manage"
  | `${(typeof CONTENT_RESOURCES)[number]}:${"read" | "write"}`;

const readOnlyPermissions: readonly AdminPermission[] = ["dashboard:read", "analytics:read"];
const contentPermissions: AdminPermission[] = CONTENT_RESOURCES.flatMap((resource) => [
  `${resource}:read` as const,
  `${resource}:write` as const,
]);
const rolePermissions: Record<AdminRole, ReadonlySet<AdminPermission>> = {
  admin: new Set([...readOnlyPermissions, ...contentPermissions, "users:manage", "subscriptions:manage"]),
  editor: new Set([...readOnlyPermissions, ...contentPermissions]),
  moderator: new Set(readOnlyPermissions),
};

export function isAdminRole(role: unknown): role is AdminRole {
  return typeof role === "string" && ADMIN_ROLES.some((allowed) => allowed === role);
}

export function hasAdminPermission(role: unknown, permission: AdminPermission): boolean {
  return isAdminRole(role) && rolePermissions[role].has(permission);
}

const pagePermissions: Record<string, AdminPermission> = {
  "/admin": "dashboard:read",
  "/admin/analytics": "analytics:read",
  "/admin/users": "users:manage",
  "/admin/subscriptions": "subscriptions:manage",
  "/admin/quiz-generator": "quizzes:write",
  ...Object.fromEntries(CONTENT_RESOURCES.map((resource) => [`/admin/${resource}`, `${resource}:read`])),
};

export function adminPagePermission(pathname: string): AdminPermission | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "admin") return null;
  return pagePermissions[`/${parts.slice(0, 2).join("/")}`] ?? null;
}
