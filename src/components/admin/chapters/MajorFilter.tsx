// src/components/admin/chapters/MajorFilter.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; name: string; code: string | null };

export function MajorFilter({
  options,
  value,
  placeholder = "التخصص",
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
      params.delete("majorId");
    } else {
      params.set("majorId", val);
    }
    // عند تغيير التخصص احذف المقرر
    params.delete("subjectId");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>كل التخصصات</SelectItem>
        {options.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
