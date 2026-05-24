// src/components/admin/chapters/UniversityFilter.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; name: string; code: string | null };

export function UniversityFilter({
  options,
  value,
  placeholder = "الجامعة",
  allValue = "__all__",
}: {
  options: Option[];
  value: string;
  placeholder?: string;
  allValue?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const onChange = (val: string) => {
    const params = new URLSearchParams(sp.toString());
    if (val === allValue) {
      params.delete("universityId");
    } else {
      params.set("universityId", val);
    }
    // عند تغيير الجامعة احذف التخصص والمقرر
    params.delete("majorId");
    params.delete("subjectId");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={allValue}>كل الجامعات</SelectItem>
        {options.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
