"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";

export function CollegeFilter({
  value,
  disabled,
}: {
  value: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const universityId = searchParams.get("universityId") ?? "";
  const selected = value === "__all__" ? "" : value;

  const onChange = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next) params.set("collegeId", next);
    else params.delete("collegeId");
    params.delete("page");
    router.push(`${pathname}?${params}`);
  };

  return (
    <div className="w-full sm:w-56">
      <AdminLookupCombobox
        type="college"
        value={selected}
        onValueChange={onChange}
        universityId={universityId}
        disabled={disabled || !universityId}
        placeholder={universityId ? "تصفية حسب الكلية" : "اختر الجامعة أولًا"}
      />
    </div>
  );
}
