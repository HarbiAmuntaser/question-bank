"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, BookOpen } from "lucide-react";
import { MajorDialog } from "./major-dialog";
import { DeleteMajorDialog } from "./delete-major-dialog";
import Link from "next/link";

// أبسط تمثيل مطلوب داخل الأكشن (متوافق مع ما نمرره من الجدول)
export type MajorMinimal = {
  id: string;
  name: string;
  code: string | null;
  degreeType: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  universityId: string | undefined; // قد يكون undefined في بعض الشاشات
  durationYears: number | null; // ليس ضرورياً دائماً
};

interface MajorActionsProps {
  major: MajorMinimal;
}

export function MajorActions({ major }: MajorActionsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
            <Link href={`/admin/subjects?majorId=${major.id}`}>
              <BookOpen className="ml-2 h-4 w-4" />
              عرض المقررات
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

      {/* نحافظ على نفس الواجهة الحالية لمربع الحوار */}
      <MajorDialog major={major as any} open={showEditDialog} onOpenChange={setShowEditDialog} />

      <DeleteMajorDialog major={major as any} open={showDeleteDialog} onOpenChange={setShowDeleteDialog} />
    </>
  );
}
