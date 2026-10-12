"use client"

import { useRef, useState } from "react"
import { FileJson, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  MAX_SEO_IMPORT_BYTES,
  parseSeoImportText,
  type SeoImportData,
  type SeoImportField,
} from "@/lib/admin/seo-import"

const fieldLabels: Record<SeoImportField, string> = {
  metaTitle: "Meta Title",
  metaDescription: "Meta Description",
  ogTitle: "OG Title",
  ogDescription: "OG Description",
  ogImageUrl: "OG Image URL",
  canonicalUrl: "Canonical URL",
  noindex: "Noindex",
  nofollow: "Nofollow",
  schemaJson: "Schema JSON-LD",
}

const template = JSON.stringify(
  {
    metaTitle: "",
    metaDescription: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: "",
    canonicalUrl: "",
    noindex: false,
    nofollow: false,
    schemaJson: { "@context": "https://schema.org", "@type": "WebPage" },
  },
  null,
  2,
)

export function SeoImportPanel({ onApply }: { onApply: (data: SeoImportData) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState("")
  const [error, setError] = useState<string>()
  const [preview, setPreview] = useState<{ data: SeoImportData; fields: SeoImportField[] }>()

  function inspect(nextText = text) {
    const result = parseSeoImportText(nextText)
    if (!result.ok) {
      setPreview(undefined)
      setError(result.error)
      return
    }
    setError(undefined)
    setPreview(result)
  }

  async function readFile(file: File | undefined) {
    if (!file) return
    if (file.size > MAX_SEO_IMPORT_BYTES) {
      setPreview(undefined)
      setError("ملف الاستيراد أكبر من 64KB.")
      return
    }
    const nextText = await file.text()
    setText(nextText)
    inspect(nextText)
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileJson className="ml-2 h-4 w-4" />
        استيراد حقول SEO
      </Button>
    )
  }

  return (
    <section className="space-y-3 rounded-md border bg-muted/20 p-4" aria-label="استيراد حقول SEO">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">استيراد سجل JSON واحد</h3>
          <p className="text-xs text-muted-foreground">يفحص الحقول ويملأ النموذج فقط؛ لن يتم الحفظ تلقائيًا.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void readFile(event.target.files?.[0])}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <Upload className="ml-2 h-4 w-4" />
            اختيار ملف
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setText(template)
              setPreview(undefined)
              setError(undefined)
            }}
          >
            قالب JSON
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
            إغلاق
          </Button>
        </div>
      </div>

      <Textarea
        dir="ltr"
        className="min-h-40 font-mono text-xs"
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setPreview(undefined)
          setError(undefined)
        }}
        placeholder={template}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "seo-import-error" : undefined}
      />

      {error ? (
        <p id="seo-import-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-2 rounded-md border bg-background p-3">
          <p className="text-sm font-medium">الحقول الجاهزة للتطبيق:</p>
          <ul className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {preview.fields.map((field) => (
              <li key={field} className="rounded border px-2 py-1">
                {fieldLabels[field]}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onApply(preview.data)
              setOpen(false)
            }}
          >
            تطبيق على النموذج
          </Button>
        </div>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => inspect()} disabled={!text.trim()}>
          فحص ومعاينة
        </Button>
      )}
    </section>
  )
}
