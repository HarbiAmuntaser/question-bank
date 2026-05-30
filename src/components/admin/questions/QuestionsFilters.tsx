"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";

export function QuestionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const universityId = sp.get("universityId") ?? "";
  const majorId = sp.get("majorId") ?? "";
  const subjectId = sp.get("subjectId") ?? "";
  const chapterId = sp.get("chapterId") ?? "";

  const pushParams = (patch: Record<string, string | null>) => {
    const params = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    params.delete("page");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center" aria-busy={isPending}>
      <div className="w-full sm:w-56">
        <AdminLookupCombobox
          type="university"
          value={universityId}
          onValueChange={(value) =>
            pushParams({ universityId: value, majorId: null, subjectId: null, chapterId: null })
          }
          placeholder="كل الجامعات"
        />
      </div>

      <div className="w-full sm:w-56">
        <AdminLookupCombobox
          type="major"
          value={majorId}
          onValueChange={(value) => pushParams({ majorId: value, subjectId: null, chapterId: null })}
          universityId={universityId}
          disabled={!universityId && !majorId}
          placeholder={universityId ? "كل التخصصات" : "اختر الجامعة أولاً"}
        />
      </div>

      <div className="w-full sm:w-56">
        <AdminLookupCombobox
          type="subject"
          value={subjectId}
          onValueChange={(value) => pushParams({ subjectId: value, chapterId: null })}
          majorId={majorId}
          disabled={!majorId && !subjectId}
          placeholder={majorId ? "كل المقررات" : "اختر التخصص أولاً"}
        />
      </div>

      <div className="w-full sm:w-56">
        <AdminLookupCombobox
          type="chapter"
          value={chapterId}
          onValueChange={(value) => pushParams({ chapterId: value })}
          subjectId={subjectId}
          disabled={!subjectId && !chapterId}
          placeholder={subjectId ? "كل الفصول" : "اختر المقرر أولاً"}
        />
      </div>
    </div>
  );
}
