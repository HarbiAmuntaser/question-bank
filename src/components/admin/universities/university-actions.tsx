"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { UniversityDialog } from "./university-dialog";
import { DeleteUniversityDialog } from "./DeleteUniversityDialog";
import { UniversityDetailsDialog } from "./UniversityDetailsDialog";

// Prop type مخصّص لتجنّب الاعتماد على نوع كامل مع تواريخ
export interface UniversityMinimal {
  id: string;
  name: string;
  code: string | null;
  city: string | null;
  region: string | null;
  isActive: boolean;

  countryCode: string;
  institutionType: "university" | "school" | "academy";
  
}

interface UniversityActionsProps {
  university: UniversityMinimal;
}

export function UniversityActions({ university }: UniversityActionsProps) {
  const [showEditDialog, setShowEditDialog] = useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState<boolean>(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0" aria-label="فتح القائمة">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowDetailsDialog(true)}>
            <Eye className="ml-2 h-4 w-4" />
            عرض التفاصيل
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

      <UniversityDialog
        university={university}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />

      <DeleteUniversityDialog
        university={university}
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
      />

      <UniversityDetailsDialog
        universityId={university.id}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />
    </>
  );
}
