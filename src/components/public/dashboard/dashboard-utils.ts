// src/components/public/dashboard/dashboard-utils.ts

export function toDate(value: unknown): Date | null {
  try {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isFinite(d.getTime()) ? d : null;
  } catch {
    return null;
  }
}

export function dayKey(d: Date) {
  // مفتاح يومي محلي: YYYY-MM-DD
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.floor(Number(seconds || 0)));
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
}

export function gradeColorClass(grade: string) {
  switch (grade) {
    case "ممتاز":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
    case "جيد جداً":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300";
    case "جيد":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
    case "مقبول":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300";
    default:
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
  }
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
