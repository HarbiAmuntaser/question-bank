"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Edit, Trash2, Eye, HelpCircle } from "lucide-react"
import Link from "next/link"
import type { ChapterWithRelations } from "@/types"
import { ChapterDialog } from "./chapter-dialog"
import { DeleteChapterDialog } from "./delete-chapter-dialog"

interface ChapterActionsProps {
  chapter: ChapterWithRelations
}

export function ChapterActions({ chapter }: ChapterActionsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">فتح القائمة</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Eye className="ml-2 h-4 w-4" />
            عرض التفاصيل
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/questions?chapterId=${chapter.id}`}>
              <HelpCircle className="ml-2 h-4 w-4" />
              عرض الأسئلة
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="ml-2 h-4 w-4" />
            تعديل
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600">
            <Trash2 className="ml-2 h-4 w-4" />
            حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ChapterDialog chapter={chapter} open={showEditDialog} onOpenChange={setShowEditDialog} />

      <DeleteChapterDialog chapter={chapter} open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />
    </>
  )
}
