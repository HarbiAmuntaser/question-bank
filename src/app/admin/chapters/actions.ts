// app/admin/chapters/actions.ts
"use server";


import { requireAdminPermission } from "@/lib/admin-auth";
import { adminApiFetch as apiFetch } from "@/lib/server/admin-api-fetch";
import { revalidatePath, revalidateTag } from "next/cache";


// اجلب base URL آمن يعمل على السيرفر


// ✅ اجلب base URL آمن يعمل على السيرفر (Next 15: headers() async)

export async function createChapterAction(formData: FormData) {
  await requireAdminPermission("chapters:write");

  try {
    const learningObjectives = (formData.get("learningObjectives") as string) || "";
    const data = {
      subjectId: formData.get("subjectId") as string,
      name: formData.get("name") as string,
      slug: (formData.get("slug") as string) || null,
      chapterNumber: Number.parseInt((formData.get("chapterNumber") as string) || "") || null,
      description: (formData.get("description") as string) || null,
      learningObjectives: learningObjectives
        ? learningObjectives.split("\n").map((t) => t.trim()).filter(Boolean)
        : [],
      isActive: formData.get("isActive") === "on",
    };

    const res = await apiFetch(`/api/v1/admin/chapters`, {
      method: "POST",
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(async () => ({ message: await res.text().catch(() => "") }));
      const msg =
        (body?.message as string) ||
        (body?.error as string) ||
        (body?.code as string) ||
        `HTTP ${res.status}`;
      return { success: false, message: msg === "unauthorized" ? "غير مصرح" : msg };
    }

    // إبطال الكاش
    revalidateTag("chapters");
    revalidatePath("/admin/chapters");
    return { success: true, message: "تم إنشاء الفصل بنجاح" };
  } catch (error) {
    console.error("Error creating chapter:", error);
    return { success: false, message: "حدث خطأ أثناء إنشاء الفصل" };
  }
}

export async function updateChapterAction(id: string, formData: FormData) {
  await requireAdminPermission("chapters:write");

  try {
    const learningObjectives = (formData.get("learningObjectives") as string) || "";
    const data = {
      subjectId: formData.get("subjectId") as string,
      name: formData.get("name") as string,
      slug: (formData.get("slug") as string) || null,
      chapterNumber: Number.parseInt((formData.get("chapterNumber") as string) || "") || null,
      description: (formData.get("description") as string) || null,
      learningObjectives: learningObjectives
        ? learningObjectives.split("\n").map((t) => t.trim()).filter(Boolean)
        : [],
      isActive: formData.get("isActive") === "on",
    };

    const res = await apiFetch(`/api/v1/admin/chapters/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json().catch(async () => ({ message: await res.text().catch(() => "") }));
      const msg =
        (body?.message as string) ||
        (body?.error as string) ||
        (body?.code as string) ||
        `HTTP ${res.status}`;
      return { success: false, message: msg === "unauthorized" ? "غير مصرح" : msg };
    }

    revalidateTag("chapters");
    revalidatePath("/admin/chapters");
    return { success: true, message: "تم تحديث الفصل بنجاح" };
  } catch (error) {
    console.error("Error updating chapter:", error);
    return { success: false, message: "حدث خطأ أثناء تحديث الفصل" };
  }
}

export async function deleteChapterAction(id: string) {
  await requireAdminPermission("chapters:write");

  try {
    const res = await apiFetch(`/api/v1/admin/chapters/${id}`, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(async () => ({ message: await res.text().catch(() => "") }));
      const msg =
        (body?.message as string) ||
        (body?.error as string) ||
        (body?.code as string) ||
        `HTTP ${res.status}`;
      return { success: false, message: msg === "unauthorized" ? "غير مصرح" : msg };
    }

    revalidateTag("chapters");
    revalidatePath("/admin/chapters");
    return { success: true, message: "تم حذف الفصل بنجاح" };
  } catch (error) {
    console.error("Error deleting chapter:", error);
    return { success: false, message: "فشل في حذف الفصل. قد يحتوي على أسئلة مرتبطة." };
  }
}
