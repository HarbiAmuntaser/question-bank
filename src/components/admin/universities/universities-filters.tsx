"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Label } from "@/components/ui/label";

export function UniversitiesFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const country = sp.get("countryCode") ?? "";
  const type = sp.get("institutionType") ?? "";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/v1/admin/universities/countries", { cache: "no-store" });
        const json = (await res.json()) as { data: string[] };
        setCountries(json.data || []);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const onChange = (next: Record<string, string>) => {
    const usp = new URLSearchParams(sp.toString());

    // حدّث القيم
    Object.entries(next).forEach(([k, v]) => {
      if (!v) usp.delete(k);
      else usp.set(k, v);
    });

    // عند تفريغ الدولة، نظّف النوع التابع
    if (!usp.get("countryCode")) usp.delete("institutionType");

    // ارجع للصفحة الأولى عند تغيير الفلاتر
    usp.delete("page");

    router.push(`${pathname}?${usp.toString()}`);
  };

  const institutionTypes = useMemo(
    () => [
      { value: "", label: "الكل" },
      { value: "university", label: "جامعة" },
      { value: "school", label: "مدرسة" },
      { value: "academy", label: "أكاديمية" },
    ],
    []
  );

  return (
    <div className="flex items-end gap-3">
      {/* دولة */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="countryCode">الدولة</Label>
        <select
          id="countryCode"
          className="h-10 rounded-md border px-3 bg-background"
          value={country}
          onChange={(e) => onChange({ countryCode: e.target.value })}
          disabled={loading}
        >
          <option value="">الكل</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* النوع (تابع للدولة) */}
      <div className="flex flex-col gap-1">
        <Label htmlFor="institutionType">النوع</Label>
        <select
          id="institutionType"
          className="h-10 rounded-md border px-3 bg-background"
          value={type}
          onChange={(e) => onChange({ institutionType: e.target.value })}
          // اجعله غير مفعّل حتى تُحدّد الدولة (حسب طلب الاعتمادية)
          disabled={!country}
        >
          {institutionTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
