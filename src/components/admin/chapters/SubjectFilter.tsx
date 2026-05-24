// src/components/admin/chapters/SubjectFilter.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; name: string; code: string | null };

export function SubjectFilter({
  options,
  value,
  placeholder = "المقرر",
  allValue = "__all__",
  disabled = false,
}: {
  options: Option[];
  value: string;
  placeholder?: string;
  allValue?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const onChange = (val: string) => {
    const params = new URLSearchParams(sp.toString());
    if (val === allValue) {
      params.delete("subjectId");
    } else {
      params.set("subjectId", val);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>كل المقررات</SelectItem>
        {options.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
