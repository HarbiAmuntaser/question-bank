"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";

type Option = { id: string; name: string; code: string | null };

export function SubjectFilter({
  value,
  placeholder = "المقرر",
  allValue = "__all__",
  disabled = false,
}: {
  options?: Option[];
  value: string;
  placeholder?: string;
  allValue?: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const pathname = usePathname();
  const majorId = sp.get("majorId") ?? "";
  const selectedValue = value === allValue ? "" : value;

  const onChange = (next: string) => {
    const params = new URLSearchParams(sp.toString());
    if (next) params.set("subjectId", next);
    else params.delete("subjectId");
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="w-full sm:w-48">
      <AdminLookupCombobox
        type="subject"
        value={selectedValue}
        onValueChange={onChange}
        majorId={majorId}
        disabled={disabled || (!majorId && !selectedValue)}
        placeholder={majorId ? placeholder : "اختر التخصص أولاً"}
      />
    </div>
  );
}
