"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";

type MajorOption = { id: string; name: string; code: string | null };

export function MajorFilter({
  value,
  placeholder = "تصفية حسب التخصص",
  allValue = "__all__",
  disabled = false,
}: {
  options?: MajorOption[];
  value: string;
  placeholder?: string;
  allValue?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const universityId = sp.get("universityId") ?? "";
  const selectedValue = value === allValue ? "" : value;

  const onChange = (next: string) => {
    const params = new URLSearchParams(sp.toString());
    if (next) params.set("majorId", next);
    else params.delete("majorId");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full sm:w-56">
      <AdminLookupCombobox
        type="major"
        value={selectedValue}
        onValueChange={onChange}
        universityId={universityId}
        disabled={disabled || (!universityId && !selectedValue)}
        placeholder={universityId ? placeholder : "اختر الجامعة أولاً"}
      />
    </div>
  );
}
