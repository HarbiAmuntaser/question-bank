import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInForm } from "@/components/auth/signin-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/admin");

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8 sm:px-6 lg:px-8"
      dir="rtl"
    >
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <p className="text-sm font-medium text-primary">لوحة إدارة مستواك</p>
          <h1 className="mt-3 text-2xl font-bold tracking-normal text-foreground sm:text-3xl">
            تسجيل دخول الإدارة
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            أدخل بيانات حسابك للوصول إلى لوحة التحكم.
          </p>
        </div>

        <Card className="border bg-card/95 shadow-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-xl">مرحباً بعودتك</CardTitle>
            <CardDescription>تأكد من البريد وكلمة المرور قبل المتابعة.</CardDescription>
          </CardHeader>
          <CardContent>
            <SignInForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
