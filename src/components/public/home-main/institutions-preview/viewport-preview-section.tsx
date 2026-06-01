"use client";

import type { ComponentType, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import type { InstType } from "./types";
import type { UniversityPreviewItem } from "./institutions-preview-section";

type ClientPreviewProps = {
  cc: string;
  type: InstType;
  initialItems?: UniversityPreviewItem[];
};

type Props = {
  cc: string;
  type: InstType;
  initialItems: UniversityPreviewItem[];
  children: ReactNode;
};

export function ViewportInstitutionsPreviewSection({ cc, type, initialItems, children }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [shouldLoadClient, setShouldLoadClient] = useState(false);
  const [ClientSection, setClientSection] = useState<ComponentType<ClientPreviewProps> | null>(null);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || shouldLoadClient) return;

    if (!("IntersectionObserver" in window)) {
      setShouldLoadClient(true);
      return;
    }

    // Start loading shortly before the lower preview reaches the viewport.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldLoadClient(true);
          observer.disconnect();
        }
      },
      { rootMargin: "360px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldLoadClient]);

  useEffect(() => {
    if (!shouldLoadClient || ClientSection) return;

    let cancelled = false;
    void import("./institutions-preview-section").then((mod) => {
      if (!cancelled) {
        setClientSection(() => mod.InstitutionsPreviewSection);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [ClientSection, shouldLoadClient]);

  return (
    <div ref={rootRef}>
      {ClientSection ? (
        <ClientSection cc={cc} type={type} initialItems={initialItems} />
      ) : (
        children
      )}
    </div>
  );
}
