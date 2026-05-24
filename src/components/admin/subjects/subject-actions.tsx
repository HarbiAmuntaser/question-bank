"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye, FileText } from "lucide-react";
import { SubjectDialog } from "./subject-dialog";
import { DeleteSubjectDialog } from "./delete-subject-dialog";
import Link from "next/link";

// نكتفي بالحقول التي يحتاجها هذا الكومبوننت وما يمرره للحوارين
export interface SubjectMinimal {
  id: string;
  name: string;
  code: string | null;
  creditHours: number | null;
  semester: number | null;
  year: number | null;
  description: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
  majorId?: string;
  // للعرض في SubjectDialog/Actions قد تحتاج وجود major.name / university.name
  // لكن لو لم تكن متاحة لن ينهار الكومبوننت
  major?: {
    id: string;
    name: string;
    code: string | null;
    university?: { id: string; name: string; code: string | null } | null;
  } | null;
}

interface SubjectActionsProps {
  subject: SubjectMinimal;
}

export function SubjectActions({ subject }: SubjectActionsProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="فتح القائمة">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <Eye className="ml-2 h-4 w-4" />
            عرض التفاصيل
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/admin/chapters?subjectId=${subject.id}`}>
              <FileText className="ml-2 h-4 w-4" />
              عرض الفصول
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="ml-2 h-4 w-4" />
            تعديل
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteDialog(true)}
            className="text-red-600"
          >
            <Trash2 className="ml-2 h-4 w-4" />
            حذف
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SubjectDialog
        subject={subject}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <DeleteSubjectDialog
        subject={subject}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />
    </>
  );
}
