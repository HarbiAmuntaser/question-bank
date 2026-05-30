"use client";

import { useCallback, useEffect, useState } from "react";

import {
  resolveAdminLookupAction,
  searchChaptersAction,
  searchMajorsAction,
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
  majorId?: string;
  subjectId?: string;
  disablePortal?: boolean;
};

function toComboOption(option: AdminLookupOption | null): ComboOption | null {
  if (!option) return null;
  return {
    id: option.id,
    label: option.label,
    subLabel: option.subLabel ?? option.code ?? undefined,
  };
}

export function AdminLookupCombobox({
  type,
  value,
  onValueChange,
  placeholder,
  disabled,
  universityId,
  majorId,
  subjectId,
  disablePortal,
}: LookupComboboxProps) {
  const [selected, setSelected] = useState<ComboOption | null>(null);

  useEffect(() => {
    let alive = true;

    if (!value) {
      setSelected(null);
      return;
    }

    void resolveAdminLookupAction(type, value).then((option) => {
      if (alive) setSelected(toComboOption(option));
    });

    return () => {
      alive = false;
    };
  }, [type, value]);

  const fetcher = useCallback(
    async (query: string) => {
      if (type === "university") {
        return searchUniversitiesAction({ query, limit: 30 });
      }
      if (type === "major") {
        return searchMajorsAction({ universityId, query, limit: 30 });
      }
      if (type === "subject") {
        return searchSubjectsAction({ majorId, query, limit: 30 });
      }
      return searchChaptersAction({ subjectId, query, limit: 30 });
    },
    [majorId, subjectId, type, universityId],
  );

  const depsKey = `${type}:${universityId ?? ""}:${majorId ?? ""}:${subjectId ?? ""}`;

  return (
    <AsyncCombobox
      value={selected}
      onChange={(next) => {
        setSelected(next);
        onValueChange(next?.id ?? "");
      }}
      placeholder={placeholder}
      disabled={disabled}
      fetcher={fetcher}
      depsKey={depsKey}
      disablePortal={disablePortal}
    />
  );
}
