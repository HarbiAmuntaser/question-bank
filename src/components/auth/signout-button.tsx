"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button onClick={() => signOut({ callbackUrl: "/auth/signin" })}>
      <LogOut className="ml-2 h-4 w-4" aria-hidden />
      تسجيل الخروج
    </Button>
  );
}
