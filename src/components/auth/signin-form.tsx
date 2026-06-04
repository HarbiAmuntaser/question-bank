"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

type SignInErrors = {
  email?: string
  password?: string
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function SignInForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<SignInErrors>({})
  const { toast } = useToast()

  const handleSubmit = async (formData: FormData) => {
    const email = String(formData.get("email") ?? "").trim().toLowerCase()
    const password = String(formData.get("password") ?? "")
    const nextErrors: SignInErrors = {}

    if (!email) {
      nextErrors.email = "البريد الإلكتروني مطلوب."
    } else if (!isValidEmail(email)) {
      nextErrors.email = "أدخل بريدًا إلكترونيًا صحيحًا."
    }

    if (!password) {
      nextErrors.password = "كلمة المرور مطلوبة."
    } else if (password.length < 6) {
      nextErrors.password = "كلمة المرور يجب ألا تقل عن 6 أحرف."
    }

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: "تعذر تسجيل الدخول",
          description: "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
          variant: "destructive",
        })
        setErrors({ password: "تحقق من بيانات الدخول ثم حاول مرة أخرى." })
      } else {
        window.location.href = "/admin"
      }
    } catch {
      toast({
        title: "تعذر تسجيل الدخول",
        description: "حدث خطأ غير متوقع. حاول مرة أخرى بعد قليل.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-5" noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="admin@example.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="h-11"
        />
        {errors.email ? (
          <p id="email-error" className="text-sm text-destructive">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="h-11"
        />
        {errors.password ? (
          <p id="password-error" className="text-sm text-destructive">
            {errors.password}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="h-11 w-full" disabled={isLoading}>
        {isLoading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
      </Button>
    </form>
  )
}
