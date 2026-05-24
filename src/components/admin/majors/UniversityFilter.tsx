// src/components/admin/majors/UniversityFilter.tsx
"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type UniversityOption = { id: string; name: string; code: string | null };

export function UniversityFilter({
  options,
  value,
  placeholder = "تصفية حسب الجامعة",
  allValue = "__all__",
}: {
  options: UniversityOption[];
  value: string; // محكوم: إمّا id أو allValue
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
      // عند تغيير الفلتر نرجّع للصفحة 1
      params.delete("page");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-56">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {/* خيار جميع الجامعات بقيمة غير فارغة لتجنّب خطأ Select */}
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
