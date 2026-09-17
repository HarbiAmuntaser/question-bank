"use client";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function PasswordInput({ name = "password", autoComplete = "current-password", minLength }: {
  name?: string; autoComplete?: string; minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return <div className="relative">
    <Input id={name} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} required minLength={minLength}
      maxLength={minLength ? 72 : 256} className="h-11 pl-12" dir="auto" />
    <Button type="button" variant="ghost" size="icon" className="absolute left-1 top-1 h-9 w-9" aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
      title={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setVisible(!visible)}>
      {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
    </Button>
  </div>;
}
