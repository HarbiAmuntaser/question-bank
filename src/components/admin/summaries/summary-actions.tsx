"use client";

import { useState } from "react";
import { Archive, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { ArchiveSummaryDialog } from "./archive-summary-dialog";
import { SummaryDialog } from "./summary-dialog";
import type { StudySummaryRow } from "./types";

export function SummaryActions({ summary }: { summary: StudySummaryRow }) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`إجراءات ${summary.title}`}>
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" aria-hidden />
            تعديل
          </DropdownMenuItem>
          {summary.status !== "archived" ? (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setArchiveOpen(true)}>
              <Archive className="h-4 w-4" aria-hidden />
              أرشفة
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <SummaryDialog summary={summary} open={editOpen} onOpenChange={setEditOpen} />
      <ArchiveSummaryDialog summary={summary} open={archiveOpen} onOpenChange={setArchiveOpen} />
    </>
  );
}
