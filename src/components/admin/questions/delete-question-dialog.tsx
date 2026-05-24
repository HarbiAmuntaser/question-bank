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
import { deleteQuestionAction } from "@/app/admin/questions/actions"
import { useToast } from "@/hooks/use-toast"
import type { QuestionWithRelations } from "@/types"

interface DeleteQuestionDialogProps {
  question: QuestionWithRelations
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteQuestionDialog({ question, open, onOpenChange }: DeleteQuestionDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      const result = await deleteQuestionAction(question.id)

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
            لا يمكن التراجع عن هذا الإجراء. سيؤدي هذا إلى حذف السؤال نهائياً من بنك الأسئلة.
            <br />
            <br />
            <strong>السؤال:</strong> {question.questionText.substring(0, 100)}
            {question.questionText.length > 100 && "..."}
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
