"use client";

import { useState } from "react";
import { Ban, MoreHorizontal, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { BlogTaxonomyDialog } from "./blog-taxonomy-dialog";
import { DisableBlogTaxonomyDialog } from "./disable-blog-taxonomy-dialog";
import type { BlogTaxonomyKind, BlogTaxonomyRow } from "./types";

export function BlogTaxonomyActions({
  kind,
  item,
}: {
  kind: BlogTaxonomyKind;
  item: BlogTaxonomyRow;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [disableOpen, setDisableOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`إجراءات ${item.name}`}>
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" aria-hidden />
            تعديل
          </DropdownMenuItem>
          {item.isActive ? (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDisableOpen(true)}>
              <Ban className="h-4 w-4" aria-hidden />
              تعطيل
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <BlogTaxonomyDialog kind={kind} item={item} open={editOpen} onOpenChange={setEditOpen} />
      <DisableBlogTaxonomyDialog kind={kind} item={item} open={disableOpen} onOpenChange={setDisableOpen} />
    </>
  );
}
