// src/components/admin/subjects/MajorFilter.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type MajorOption = { id: string; name: string; code: string | null };

export function MajorFilter({
  options,
  value,
  placeholder = "تصفية حسب التخصص",
  allValue = "__all__",
  disabled = false,
}: {
  options: MajorOption[];
  value: string; // id أو __all__
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
      params.delete("page");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-56">
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
