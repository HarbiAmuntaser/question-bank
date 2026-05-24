"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: "خطأ",
          description: "بيانات الاعتماد غير صحيحة. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        })
      } else {
        window.location.href = "/admin"
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ ما. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input id="email" name="email" type="email" placeholder="admin@example.com" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input id="password" name="password" type="password" required />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
      </Button>
    </form>
  )
}
