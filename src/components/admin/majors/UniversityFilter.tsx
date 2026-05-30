"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";

type UniversityOption = { id: string; name: string; code: string | null };

export function UniversityFilter({
  value,
  placeholder = "تصفية حسب الجامعة",
  allValue = "__all__",
}: {
  options?: UniversityOption[];
  value: string;
  placeholder?: string;
  allValue?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();

  const selectedValue = value === allValue ? "" : value;

  const onChange = (next: string) => {
    const params = new URLSearchParams(sp.toString());
    if (next) params.set("universityId", next);
    else params.delete("universityId");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full sm:w-56">
      <AdminLookupCombobox
        type="university"
        value={selectedValue}
        onValueChange={onChange}
        placeholder={placeholder}
      />
    </div>
  );
}
