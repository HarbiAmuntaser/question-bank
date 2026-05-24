import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInForm } from "@/components/auth/signin-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";


export default async function SignInPage() {
const session = await getServerSession(authOptions);
if (session) redirect("/admin");
return (
<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8" dir="rtl">
<div className="max-w-md w-full space-y-8">
<div className="text-center">
<h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">تسجيل دخول المدير</h2>
<p className="mt-2 text-sm text-gray-600 dark:text-gray-400">نظام إدارة بنك الأسئلة السعودي</p>
</div>
<Card>
<CardHeader>
<CardTitle>مرحباً بعودتك</CardTitle>
<CardDescription>سجل دخولك للوصول إلى لوحة الإدارة</CardDescription>
</CardHeader>
<CardContent>
<SignInForm />
</CardContent>
</Card>
</div>
</div>
);
}