"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { deleteChapterAction } from "@/app/admin/chapters/actions"
import { useToast } from "@/hooks/use-toast"
import type { ChapterWithRelations } from "@/types"

interface DeleteChapterDialogProps {
  chapter: ChapterWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteChapterDialog({ chapter, open, onOpenChange }: DeleteChapterDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      const result = await deleteChapterAction(chapter.id)

      if (result.success) {
        toast({
          title: "نجح",
          description: result.message,
        })
        onOpenChange(false)
      } else {
        toast({
          title: "خطأ",
          description: result.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ غير متوقع",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>هل أنت متأكد تماماً؟</AlertDialogTitle>
          <AlertDialogDescription>
            لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف فصل <strong>{chapter.name}</strong> نهائياً وجميع الأسئلة
            المرتبطة به.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>إلغاء</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
            {isLoading ? "جاري الحذف..." : "حذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
