"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  resolveAdminLookupAction,
  searchCollegesAction,
  searchChaptersAction,
  searchMajorsAction,
  searchStudySummariesAction,
  searchSubjectsAction,
  searchUniversitiesAction,
  type AdminLookupOption,
  type AdminLookupType,
} from "@/app/admin/lookups/actions";
import { AsyncCombobox, type ComboOption } from "@/components/admin/seo/AsyncCombobox";

type LookupComboboxProps = {
  type: AdminLookupType;
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  universityId?: string;
  collegeId?: string;
  universityType?: "university" | "school" | "academy";
  majorId?: string;
  subjectId?: string;
  chapterId?: string;
  disablePortal?: boolean;
  onOptionChange?: (option: AdminLookupOption | null) => void;
  "data-admin-field"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

function toComboOption(option: AdminLookupOption | null): ComboOption | null {
  if (!option) return null;
  return {
    id: option.id,
    label: option.label,
    subLabel: option.subLabel ?? option.code ?? undefined,
    institutionType: option.institutionType,
  };
}

export function AdminLookupCombobox({
  type,
  value,
  onValueChange,
  placeholder,
  disabled,
  universityId,
  collegeId,
  universityType,
  majorId,
  subjectId,
  chapterId,
  disablePortal,
  onOptionChange,
  "data-admin-field": adminField,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
}: LookupComboboxProps) {
  const [selected, setSelected] = useState<ComboOption | null>(null);
  const optionChangeRef = useRef(onOptionChange);
  optionChangeRef.current = onOptionChange;

  useEffect(() => {
    let alive = true;

    if (!value) {
      setSelected(null);
      optionChangeRef.current?.(null);
      return;
    }

    void resolveAdminLookupAction(type, value).then((option) => {
      if (alive) {
        setSelected(toComboOption(option));
        optionChangeRef.current?.(option);
      }
    });

    return () => {
      alive = false;
    };
  }, [type, value]);

  const fetcher = useCallback(
    async (query: string) => {
      if (type === "university") {
        return searchUniversitiesAction({ query, limit: 30, institutionType: universityType });
      }
      if (type === "college") {
        return searchCollegesAction({ universityId, query, limit: 30 });
      }
      if (type === "major") {
        return searchMajorsAction({ universityId, collegeId, query, limit: 30 });
      }
      if (type === "subject") {
        return searchSubjectsAction({ majorId, query, limit: 30 });
      }
      if (type === "summary") {
        return searchStudySummariesAction({ chapterId, query, limit: 30 });
      }
      return searchChaptersAction({ subjectId, query, limit: 30 });
    },
    [chapterId, collegeId, majorId, subjectId, type, universityId, universityType],
  );

  const depsKey = `${type}:${universityId ?? ""}:${collegeId ?? ""}:${universityType ?? ""}:${majorId ?? ""}:${subjectId ?? ""}:${chapterId ?? ""}`;

  return (
    <AsyncCombobox
      value={selected}
      onChange={(next) => {
        setSelected(next);
        onOptionChange?.(next);
        onValueChange(next?.id ?? "");
      }}
      placeholder={placeholder}
      disabled={disabled}
      data-admin-field={adminField}
      aria-invalid={ariaInvalid}
      aria-describedby={ariaDescribedBy}
      fetcher={fetcher}
      depsKey={depsKey}
      disablePortal={disablePortal}
    />
  );
}
