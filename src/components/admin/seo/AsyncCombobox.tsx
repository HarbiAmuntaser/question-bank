// src/components/admin/seo/AsyncCombobox.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = { id: string; label: string; subLabel?: string };

export function AsyncCombobox({
  value,
  onChange,
  placeholder,
  disabled,
  fetcher,
  depsKey,
}: {
  value: ComboOption | null;
  onChange: (next: ComboOption | null) => void;
  placeholder: string;
  disabled?: boolean;
  fetcher: (q: string) => Promise<ComboOption[]>;
  depsKey?: string; // لتفريغ الكاش عند تغير السلسلة
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<ComboOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const cacheRef = React.useRef<Map<string, ComboOption[]>>(new Map());
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    // تغيّر السلسلة (مثل universityId) => صفّر الكاش والاختيارات الحالية داخل القائمة
    cacheRef.current.clear();
    setItems([]);
    setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  React.useEffect(() => {
    if (!open) return;

    const key = `${depsKey ?? ""}::${query}`;
    const cached = cacheRef.current.get(key);
    if (cached) {
      setItems(cached);
      return;
    }

    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    void (async () => {
      try {
        const data = await fetcher(query);
        if (ac.signal.aborted) return;
        cacheRef.current.set(key, data);
        setItems(data);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open, query, depsKey, fetcher]);

  const label = value?.label ?? "";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-full justify-between", !value && "text-muted-foreground")}
        >
          <span className="truncate">{value ? label : placeholder}</span>
          <ChevronsUpDown className="h-4 w-4 opacity-50 ms-2" />
        </Button>
      </PopoverTrigger>

<PopoverContent
  align="start"
  sideOffset={8}
  className="p-0 min-w-[420px] w-[min(900px,95vw)] max-h-[420px] overflow-hidden"
>
        <Command>
          <CommandInput
            placeholder="ابحث..."
            value={query}
            onValueChange={setQuery}
          />
<CommandList className="max-h-[380px] overflow-auto">
            <CommandEmpty>
              {loading ? "جاري التحميل..." : "لا توجد نتائج"}
            </CommandEmpty>

            <CommandGroup>
              {loading && items.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  تحميل الخيارات...
                </div>
              ) : (
                items.map((it) => (
                  <CommandItem
                    key={it.id}
                    value={it.label}
                    onSelect={() => {
                      onChange(it);
                      setOpen(false);
                    }}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="truncate">{it.label}</div>
                      {it.subLabel ? (
                        <div className="text-xs text-muted-foreground truncate">{it.subLabel}</div>
                      ) : null}
                    </div>
                    <Check className={cn("h-4 w-4", value?.id === it.id ? "opacity-100" : "opacity-0")} />
                  </CommandItem>
                ))
              )}
            </CommandGroup>

            {value ? (
              <div className="border-t p-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-center"
                  onClick={() => onChange(null)}
                >
                  مسح الاختيار
                </Button>
              </div>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
