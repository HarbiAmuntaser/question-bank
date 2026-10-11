"use client"

import { useEffect, useState } from "react"

import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox"
import type { AdminLookupOption } from "@/app/admin/lookups/actions"
import { Label } from "@/components/ui/label"

export type AdminContentPathValue = {
  universityId: string
  collegeId: string
  majorId: string
  subjectId: string
}

const emptyValue: AdminContentPathValue = {
  universityId: "",
  collegeId: "",
  majorId: "",
  subjectId: "",
}

export function AdminContentPathPicker({
  value,
  onChange,
  disabled,
  paymentScope = false,
}: {
  value: AdminContentPathValue
  onChange: (value: AdminContentPathValue) => void
  disabled?: boolean
  paymentScope?: boolean
}) {
  const [institutionType, setInstitutionType] = useState<"university" | "school" | "academy" | null>(
    paymentScope ? "university" : null,
  )
  const showCollege = institutionType === "university"

  useEffect(() => {
    if (!showCollege && value.collegeId) onChange({ ...value, collegeId: "", majorId: "", subjectId: "" })
  }, [onChange, showCollege, value])

  const update = (next: Partial<AdminContentPathValue>) => onChange({ ...value, ...next })

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-2"><Label>الجامعة</Label><AdminLookupCombobox
          type="university"
          value={value.universityId}
          onValueChange={(universityId) => update({ universityId, collegeId: "", majorId: "", subjectId: "" })}
          onOptionChange={(option: AdminLookupOption | null) => setInstitutionType(option?.institutionType ?? (paymentScope ? "university" : null))}
          placeholder="اختر الجامعة"
          universityType={paymentScope ? "university" : undefined}
          countryCode={paymentScope ? "SA" : undefined}
          disabled={disabled}
          disablePortal
        /></div>
      {showCollege ? (
        <div className="space-y-2"><Label>الكلية (اختياري)</Label><AdminLookupCombobox
            type="college"
            value={value.collegeId}
            onValueChange={(collegeId) => update({ collegeId, majorId: "", subjectId: "" })}
            universityId={value.universityId}
            placeholder="كل تخصصات الجامعة"
            disabled={disabled || !value.universityId}
            disablePortal
          /></div>
      ) : <div className="hidden sm:block" />}
      <div className="space-y-2"><Label>التخصص</Label><AdminLookupCombobox
          type="major"
          value={value.majorId}
          onValueChange={(majorId) => update({ majorId, subjectId: "" })}
          universityId={value.universityId}
          collegeId={showCollege ? value.collegeId : undefined}
          placeholder={value.universityId ? "اختر التخصص" : "اختر الجامعة أولًا"}
          disabled={disabled || !value.universityId}
          disablePortal
        /></div>
      <div className="space-y-2"><Label>المادة</Label><AdminLookupCombobox
          type="subject"
          value={value.subjectId}
          onValueChange={(subjectId) => update({ subjectId })}
          majorId={value.majorId}
          placeholder={value.majorId ? "اختر المادة" : "اختر التخصص أولًا"}
          disabled={disabled || !value.majorId}
          disablePortal
        /></div>
    </div>
  )
}

export { emptyValue as emptyAdminContentPath }
