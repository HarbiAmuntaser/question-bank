"use client";

import type React from "react";
import { useEffect, useState, useTransition } from "react";

import { createChapterAction, updateChapterAction } from "@/app/admin/chapters/actions";
import { AdminLookupCombobox } from "@/components/admin/admin-lookup-combobox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { buildChapterSlug, normalizeChapterSlug } from "@/lib/chapter-slugs";
import type { ChapterWithRelations } from "@/types";

interface ChapterDialogProps {
  children?: React.ReactNode;
  chapter?: ChapterWithRelations;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ChapterDialog({ children, chapter, open, onOpenChange }: ChapterDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [selectedUniversity, setSelectedUniversity] = useState("");
  const [selectedMajor, setSelectedMajor] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(chapter?.subjectId || "");
  const [chapterName, setChapterName] = useState(chapter?.name ?? "");
  const [chapterSlug, setChapterSlug] = useState(chapter?.slug ?? buildChapterSlug(chapter?.name ?? ""));
  const [slugEdited, setSlugEdited] = useState(Boolean(chapter?.slug));

  const isControlled = open !== undefined && onOpenChange !== undefined;
  const dialogOpen = isControlled ? open : isOpen;
  const setDialogOpen = isControlled ? onOpenChange : setIsOpen;

  useEffect(() => {
    if (!dialogOpen) return;
    setSelectedUniversity(chapter?.subject?.major?.university?.id ?? "");
    setSelectedMajor(chapter?.subject?.majorId ?? "");
    setSelectedSubject(chapter?.subjectId ?? "");
    setChapterName(chapter?.name ?? "");
    setChapterSlug(chapter?.slug ?? buildChapterSlug(chapter?.name ?? ""));
    setSlugEdited(Boolean(chapter?.slug));
  }, [dialogOpen, chapter]);

  const handleNameChange = (value: string) => {
    setChapterName(value);
    if (!slugEdited) setChapterSlug(buildChapterSlug(value));
  };

  const handleSlugChange = (value: string) => {
    setSlugEdited(true);
    setChapterSlug(normalizeChapterSlug(value));
  };

  const handleSelectUniversity = (value: string) => {
    setSelectedUniversity(value);
    setSelectedMajor("");
    setSelectedSubject("");
  };

  const handleSelectMajor = (value: string) => {
    setSelectedMajor(value);
    setSelectedSubject("");
  };

  const handleSubmit = async (formData: FormData) => {
    if (!selectedSubject) {
      toast({ title: "خطأ", description: "يرجى اختيار المقرر", variant: "destructive" });
      return;
    }

    formData.set("subjectId", selectedSubject);

    startTransition(async () => {
      try {
        const result = chapter ? await updateChapterAction(chapter.id, formData) : await createChapterAction(formData);

        if (result.success) {
          toast({ title: "نجح", description: result.message });
          setDialogOpen(false);
          setSelectedUniversity("");
          setSelectedMajor("");
          setSelectedSubject("");
        } else {
          toast({ title: "خطأ", description: result.message, variant: "destructive" });
        }
      } catch {
        toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>{chapter ? "تعديل الفصل" : "إضافة فصل"}</DialogTitle>
          <DialogDescription>
            {chapter ? "قم بتحديث معلومات الفصل أدناه." : "أضف فصلاً جديداً إلى النظام."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">الجامعة</Label>
              <div className="col-span-3">
                <AdminLookupCombobox
                  type="university"
                  value={selectedUniversity}
                  onValueChange={handleSelectUniversity}
                  placeholder="ابحث عن جامعة"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">التخصص</Label>
              <div className="col-span-3">
                <AdminLookupCombobox
                  type="major"
                  value={selectedMajor}
                  onValueChange={handleSelectMajor}
                  universityId={selectedUniversity}
                  disabled={!selectedUniversity}
                  placeholder={selectedUniversity ? "ابحث عن تخصص" : "اختر الجامعة أولاً"}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">المقرر</Label>
              <div className="col-span-3">
                <AdminLookupCombobox
                  type="subject"
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                  majorId={selectedMajor}
                  disabled={!selectedMajor}
                  placeholder={selectedMajor ? "ابحث عن مقرر" : "اختر التخصص أولاً"}
                />
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                اسم الفصل
              </Label>
              <Input
                id="name"
                name="name"
                value={chapterName}
                onChange={(event) => handleNameChange(event.target.value)}
                className="col-span-3"
                required
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="slug" className="pt-2 text-right">
                رابط الفصل
              </Label>
              <div className="col-span-3 space-y-1.5">
                <Input
                  id="slug"
                  name="slug"
                  dir="ltr"
                  value={chapterSlug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  placeholder="python-basics"
                />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  يُنشأ تلقائيًا من اسم الفصل، ويمكن تعديله قبل الحفظ.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="chapterNumber" className="text-right">
                رقم الفصل
              </Label>
              <Input
                id="chapterNumber"
                name="chapterNumber"
                type="number"
                min="1"
                defaultValue={chapter?.chapterNumber ?? ""}
                className="col-span-3"
                placeholder="1"
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="pt-2 text-right">
                الوصف
              </Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={chapter?.description ?? ""}
                className="col-span-3"
                placeholder="وصف محتوى الفصل..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="learningObjectives" className="pt-2 text-right">
                الأهداف التعليمية
              </Label>
              <Textarea
                id="learningObjectives"
                name="learningObjectives"
                defaultValue={chapter?.learningObjectives?.join("\n") ?? ""}
                className="col-span-3"
                placeholder="اكتب كل هدف في سطر منفصل..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="isActive" className="text-right">
                نشط
              </Label>
              <Switch id="isActive" name="isActive" defaultChecked={chapter?.isActive ?? true} />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending || !selectedSubject}>
              {isPending ? "جاري الحفظ..." : chapter ? "تحديث" : "إنشاء"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
