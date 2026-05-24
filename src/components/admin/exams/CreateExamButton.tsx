// src/components/admin/exams/CreateExamButton.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExamPaperDialog } from "./ExamPaperDialog";

export function CreateExamButton({ onCreated }: { onCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة ورقة اختبار
        </Button>
      </div>
      <ExamPaperDialog open={open} onOpenChange={setOpen} onSaved={onCreated} />
    </>
  );
}
