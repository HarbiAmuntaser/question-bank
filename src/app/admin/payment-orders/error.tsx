"use client";
import { RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div dir="rtl" className="space-y-4 py-10"><p role="alert">تعذر تحميل طلبات الدفع.</p><Button onClick={reset} variant="outline" className="gap-2"><RotateCw className="h-4 w-4" />إعادة المحاولة</Button></div>; }
