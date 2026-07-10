// src/components/admin/seo/SeoOwnerSelector.tsx
"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AsyncCombobox, ComboOption } from "./AsyncCombobox"

// ✅ NEW: server actions بدل fetch من المتصفح
import { listSeoOwnersAction, resolveSeoOwnerAction, type SeoOwnerType } from "@/app/admin/seo-meta/actions"

type OwnerType = SeoOwnerType

const ownerTypeOptions: Array<{ value: OwnerType; label: string }> = [
  { value: "university", label: "جامعة" },
  { value: "major", label: "تخصص" },
  { value: "subject", label: "مقرر" },
  { value: "chapter", label: "وحدة" },
  { value: "exam", label: "امتحان" },
  { value: "blog_post", label: "مقال مدونة" },
  { value: "blog_topic", label: "موضوع مدونة" },
  { value: "study_summary", label: "ملخص دراسي" },
]

// ✅ بدل fetch: ننادي Server Action (يرسل x-admin-key)
async function fetchOwners(params: {
  type: OwnerType
  query?: string
  universityId?: string
  majorId?: string
  subjectId?: string
}): Promise<ComboOption[]> {
  const res = await listSeoOwnersAction(params)
  if (!res.success) return []
  return res.data ?? []
}

// ✅ resolve chain عند فتح التعديل
async function resolveOwner(type: OwnerType, id: string) {
  const res = await resolveSeoOwnerAction({ type, id })
  if (!res.success) return null
  return res.data as {
    ownerType: OwnerType
    chain: {
      university?: ComboOption | null
      major?: ComboOption | null
      subject?: ComboOption | null
      chapter?: ComboOption | null
      exam?: ComboOption | null
      blog_post?: ComboOption | null
      blog_topic?: ComboOption | null
      study_summary?: ComboOption | null
    }
  }
}

export function SeoOwnerSelector({
  ownerType,
  ownerId,
  onOwnerTypeChange,
  onOwnerIdChange,
  lockOwnerType,
  lockOwnerId,
}: {
  ownerType: string
  ownerId: string
  onOwnerTypeChange: (v: OwnerType) => void
  onOwnerIdChange: (v: string) => void
  lockOwnerType?: boolean
  lockOwnerId?: boolean
}) {
  const type = (ownerType as OwnerType) || "major"

  const [uni, setUni] = React.useState<ComboOption | null>(null)
  const [major, setMajor] = React.useState<ComboOption | null>(null)
  const [subject, setSubject] = React.useState<ComboOption | null>(null)
  const [chapter, setChapter] = React.useState<ComboOption | null>(null)
  const [exam, setExam] = React.useState<ComboOption | null>(null)
  const [blogPost, setBlogPost] = React.useState<ComboOption | null>(null)
  const [blogTopic, setBlogTopic] = React.useState<ComboOption | null>(null)
  const [summary, setSummary] = React.useState<ComboOption | null>(null)

  // ✅ Resolve عند فتح التعديل
  React.useEffect(() => {
    if (!ownerId) return

    let cancelled = false
    void (async () => {
      const resolved = await resolveOwner(type, ownerId)
      if (!resolved || cancelled) return

      const chain = resolved.chain
      setUni(chain.university ?? null)
      setMajor(chain.major ?? null)
      setSubject(chain.subject ?? null)
      setChapter(chain.chapter ?? null)
      setExam(chain.exam ?? null)
      setBlogPost(chain.blog_post ?? null)
      setBlogTopic(chain.blog_topic ?? null)
      setSummary(chain.study_summary ?? null)
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, ownerId])

  const changeType = (next: OwnerType) => {
    onOwnerTypeChange(next)
    onOwnerIdChange("")
    setUni(null)
    setMajor(null)
    setSubject(null)
    setChapter(null)
    setExam(null)
    setBlogPost(null)
    setBlogTopic(null)
    setSummary(null)
  }

  const setFinal = (opt: ComboOption | null) => {
    onOwnerIdChange(opt?.id ?? "")
  }

  return (
    <div className="grid gap-4">
      <div className="space-y-2">
        <Label>نوع المالك</Label>
        <Select value={type} onValueChange={(v) => changeType(v as OwnerType)} disabled={lockOwnerType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ownerTypeOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {type === "university" ? (
        <div className="space-y-2">
          <Label>الجامعة</Label>
          <AsyncCombobox
            value={uni}
            onChange={(v) => {
              setUni(v)
              setFinal(v)
            }}
            placeholder="اختر جامعة"
            disabled={lockOwnerId}
            fetcher={(q) => fetchOwners({ type: "university", query: q })}
            depsKey="university"
          />
        </div>
      ) : null}

      {type === "major" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>الجامعة (اختياري)</Label>
            <AsyncCombobox
              value={uni}
              onChange={(v) => {
                setUni(v)
                setMajor(null)
                setFinal(null)
              }}
              placeholder="كل الجامعات"
              disabled={lockOwnerId}
              fetcher={(q) => fetchOwners({ type: "university", query: q })}
              depsKey="uni-for-major"
            />
          </div>

          <div className="space-y-2">
            <Label>التخصص</Label>
            <AsyncCombobox
              value={major}
              onChange={(v) => {
                setMajor(v)
                setFinal(v)
              }}
              placeholder="اختر تخصص"
              disabled={lockOwnerId}
              fetcher={(q) => fetchOwners({ type: "major", query: q, universityId: uni?.id })}
              depsKey={`major::${uni?.id ?? "all"}`}
            />
          </div>
        </div>
      ) : null}

      {type === "subject" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>الجامعة</Label>
            <AsyncCombobox
              value={uni}
              onChange={(v) => {
                setUni(v)
                setMajor(null)
                setSubject(null)
                setFinal(null)
              }}
              placeholder="اختر جامعة"
              disabled={lockOwnerId}
              fetcher={(q) => fetchOwners({ type: "university", query: q })}
              depsKey="uni-for-subject"
            />
          </div>

          <div className="space-y-2">
            <Label>التخصص</Label>
            <AsyncCombobox
              value={major}
              onChange={(v) => {
                setMajor(v)
                setSubject(null)
                setFinal(null)
              }}
              placeholder="اختر تخصص"
              disabled={lockOwnerId || !uni}
              fetcher={(q) => fetchOwners({ type: "major", query: q, universityId: uni?.id })}
              depsKey={`major-for-subject::${uni?.id ?? ""}`}
            />
          </div>

          <div className="space-y-2">
            <Label>المقرر</Label>
            <AsyncCombobox
              value={subject}
              onChange={(v) => {
                setSubject(v)
                setFinal(v)
              }}
              placeholder="اختر مقرر"
              disabled={lockOwnerId || !major}
              fetcher={(q) => fetchOwners({ type: "subject", query: q, majorId: major?.id })}
              depsKey={`subject::${major?.id ?? ""}`}
            />
          </div>
        </div>
      ) : null}

      {type === "chapter" ? (
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
<div className="space-y-2 min-w-0">
            <Label>الجامعة</Label>
            <AsyncCombobox
              value={uni}
              onChange={(v) => {
                setUni(v)
                setMajor(null)
                setSubject(null)
                setChapter(null)
                setFinal(null)
              }}
              placeholder="اختر جامعة"
              disabled={lockOwnerId}
              fetcher={(q) => fetchOwners({ type: "university", query: q })}
              depsKey="uni-for-chapter"
            />
          </div>

          <div className="space-y-2">
            <Label>التخصص</Label>
            <AsyncCombobox
              value={major}
              onChange={(v) => {
                setMajor(v)
                setSubject(null)
                setChapter(null)
                setFinal(null)
              }}
              placeholder="اختر تخصص"
              disabled={lockOwnerId || !uni}
              fetcher={(q) => fetchOwners({ type: "major", query: q, universityId: uni?.id })}
              depsKey={`major-for-chapter::${uni?.id ?? ""}`}
            />
          </div>

          <div className="space-y-2">
            <Label>المقرر</Label>
            <AsyncCombobox
              value={subject}
              onChange={(v) => {
                setSubject(v)
                setChapter(null)
                setFinal(null)
              }}
              placeholder="اختر مقرر"
              disabled={lockOwnerId || !major}
              fetcher={(q) => fetchOwners({ type: "subject", query: q, majorId: major?.id })}
              depsKey={`subject-for-chapter::${major?.id ?? ""}`}
            />
          </div>

          <div className="space-y-2">
            <Label>الوحدة</Label>
            <AsyncCombobox
              value={chapter}
              onChange={(v) => {
                setChapter(v)
                setFinal(v)
              }}
              placeholder="اختر وحدة"
              disabled={lockOwnerId || !subject}
              fetcher={(q) => fetchOwners({ type: "chapter", query: q, subjectId: subject?.id })}
              depsKey={`chapter::${subject?.id ?? ""}`}
            />
          </div>
        </div>
      ) : null}

      {type === "exam" ? (
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
<div className="space-y-2 min-w-0">
            <Label>الجامعة</Label>
            <AsyncCombobox
              value={uni}
              onChange={(v) => {
                setUni(v)
                setMajor(null)
                setSubject(null)
                setExam(null)
                setFinal(null)
              }}
              placeholder="اختر جامعة"
              disabled={lockOwnerId}
              fetcher={(q) => fetchOwners({ type: "university", query: q })}
              depsKey="uni-for-exam"
            />
          </div>

          <div className="space-y-2">
            <Label>التخصص</Label>
            <AsyncCombobox
              value={major}
              onChange={(v) => {
                setMajor(v)
                setSubject(null)
                setExam(null)
                setFinal(null)
              }}
              placeholder="اختر تخصص"
              disabled={lockOwnerId || !uni}
              fetcher={(q) => fetchOwners({ type: "major", query: q, universityId: uni?.id })}
              depsKey={`major-for-exam::${uni?.id ?? ""}`}
            />
          </div>

          <div className="space-y-2">
            <Label>المقرر</Label>
            <AsyncCombobox
              value={subject}
              onChange={(v) => {
                setSubject(v)
                setExam(null)
                setFinal(null)
              }}
              placeholder="اختر مقرر"
              disabled={lockOwnerId || !major}
              fetcher={(q) => fetchOwners({ type: "subject", query: q, majorId: major?.id })}
              depsKey={`subject-for-exam::${major?.id ?? ""}`}
            />
          </div>

          <div className="space-y-2">
            <Label>الامتحان</Label>
            <AsyncCombobox
              value={exam}
              onChange={(v) => {
                setExam(v)
                setFinal(v)
              }}
              placeholder="اختر امتحان"
              disabled={lockOwnerId || !subject}
              fetcher={(q) => fetchOwners({ type: "exam", query: q, subjectId: subject?.id })}
              depsKey={`exam::${subject?.id ?? ""}`}
            />
          </div>
        </div>
      ) : null}

      {type === "blog_post" ? (
        <div className="space-y-2">
          <Label>مقال المدونة</Label>
          <AsyncCombobox
            value={blogPost}
            onChange={(v) => {
              setBlogPost(v)
              setFinal(v)
            }}
            placeholder="ابحث بعنوان المقال أو slug"
            disabled={lockOwnerId}
            fetcher={(q) => fetchOwners({ type: "blog_post", query: q })}
            depsKey="blog-post"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            يتم استخدام معرف المقال الداخلي كـ ownerId، بينما يبقى slug خاصًا برابط المقال العام.
          </p>
        </div>
      ) : null}

      {type === "blog_topic" ? (
        <div className="space-y-2">
          <Label>موضوع المدونة</Label>
          <AsyncCombobox
            value={blogTopic}
            onChange={(v) => {
              setBlogTopic(v)
              setFinal(v)
            }}
            placeholder="ابحث باسم الموضوع أو slug"
            disabled={lockOwnerId}
            fetcher={(q) => fetchOwners({ type: "blog_topic", query: q })}
            depsKey="blog-topic"
          />
          <p className="text-xs leading-relaxed text-muted-foreground">
            استخدم عنوانًا ووصفًا يشرحان محتوى صفحة الموضوع، وتجنب تكرار نفس بيانات SEO بين المواضيع.
          </p>
        </div>
      ) : null}

      {type === "study_summary" ? (
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
<div className="space-y-2 min-w-0">
            <Label>الجامعة</Label>
            <AsyncCombobox
              value={uni}
              onChange={(v) => {
                setUni(v)
                setMajor(null)
                setSubject(null)
                setSummary(null)
                setFinal(null)
              }}
              placeholder="اختر جامعة"
              disabled={lockOwnerId}
              fetcher={(q) => fetchOwners({ type: "university", query: q })}
              depsKey="uni-for-study-summary"
            />
          </div>

          <div className="space-y-2">
            <Label>التخصص</Label>
            <AsyncCombobox
              value={major}
              onChange={(v) => {
                setMajor(v)
                setSubject(null)
                setSummary(null)
                setFinal(null)
              }}
              placeholder="اختر تخصص"
              disabled={lockOwnerId || !uni}
              fetcher={(q) => fetchOwners({ type: "major", query: q, universityId: uni?.id })}
              depsKey={`major-for-study-summary::${uni?.id ?? ""}`}
            />
          </div>

          <div className="space-y-2">
            <Label>المقرر</Label>
            <AsyncCombobox
              value={subject}
              onChange={(v) => {
                setSubject(v)
                setSummary(null)
                setFinal(null)
              }}
              placeholder="اختر مقرر"
              disabled={lockOwnerId || !major}
              fetcher={(q) => fetchOwners({ type: "subject", query: q, majorId: major?.id })}
              depsKey={`subject-for-study-summary::${major?.id ?? ""}`}
            />
          </div>

          <div className="space-y-2">
            <Label>الملخص</Label>
            <AsyncCombobox
              value={summary}
              onChange={(v) => {
                setSummary(v)
                setFinal(v)
              }}
              placeholder="اختر ملخصًا"
              disabled={lockOwnerId || !subject}
              fetcher={(q) => fetchOwners({ type: "study_summary", query: q, subjectId: subject?.id })}
              depsKey={`study-summary::${subject?.id ?? ""}`}
            />
          </div>
        </div>
      ) : null}

      <div className="text-xs text-muted-foreground">
        المعرّف النهائي (ownerId): <span className="font-mono">{ownerId || "—"}</span>
      </div>
    </div>
  )
}
