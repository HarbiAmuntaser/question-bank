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

import { ArchiveBlogPostDialog } from "./archive-blog-post-dialog";
import { BlogPostDialog } from "./blog-post-dialog";
import type { BlogPostRow, BlogPostTagOption, BlogPostTopicOption } from "./types";

export function BlogPostActions({
  post,
  topics,
  tags,
}: {
  post: BlogPostRow;
  topics: BlogPostTopicOption[];
  tags: BlogPostTagOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`إجراءات ${post.title}`}>
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" aria-hidden />
            تعديل
          </DropdownMenuItem>
          {post.status !== "archived" ? (
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setArchiveOpen(true)}>
              <Archive className="h-4 w-4" aria-hidden />
              أرشفة
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <BlogPostDialog post={post} topics={topics} tags={tags} open={editOpen} onOpenChange={setEditOpen} />
      <ArchiveBlogPostDialog post={post} open={archiveOpen} onOpenChange={setArchiveOpen} />
    </>
  );
}
