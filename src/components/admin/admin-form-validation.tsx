"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export type AdminFieldErrors = Record<string, string | undefined>

export type AdminFormErrors = {
  formError?: string
  fieldErrors?: AdminFieldErrors
}

function fieldErrorId(formId: string, fieldName: string) {
  return `${formId}-${fieldName.replace(/[^a-zA-Z0-9_-]/g, "-")}-error`
}

function focusFirstInvalidField(form: HTMLFormElement | null, fieldErrors: AdminFieldErrors) {
  if (!form) return
  const firstField = Object.keys(fieldErrors).find((name) => Boolean(fieldErrors[name]))
  if (!firstField) return

  const target = Array.from(form.elements).find((element) => {
    if (!(element instanceof HTMLElement)) return false
    return element.getAttribute("name") === firstField || element.dataset.adminField === firstField
  })

  if (target instanceof HTMLElement) target.focus()
}

export function useAdminFormValidation(formId: string) {
  const formRef = React.useRef<HTMLFormElement>(null)
  const [formError, setFormError] = React.useState<string>()
  const [fieldErrors, setFieldErrors] = React.useState<AdminFieldErrors>({})

  const resetErrors = React.useCallback(() => {
    setFormError(undefined)
    setFieldErrors({})
  }, [])

  const clearFieldError = React.useCallback((fieldName: string) => {
    setFieldErrors((current) => {
      if (!current[fieldName]) return current
      const next = { ...current }
      delete next[fieldName]
      return next
    })
  }, [])

  const reportErrors = React.useCallback((errors: AdminFormErrors) => {
    const nextFieldErrors = errors.fieldErrors ?? {}
    setFormError(errors.formError)
    setFieldErrors(nextFieldErrors)

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => focusFirstInvalidField(formRef.current, nextFieldErrors))
    }
  }, [])

  const getFieldProps = React.useCallback(
    (fieldName: string) => {
      const message = fieldErrors[fieldName]
      return {
        "aria-invalid": message ? true : undefined,
        "aria-describedby": message ? fieldErrorId(formId, fieldName) : undefined,
        "data-admin-field": fieldName,
      } as const
    },
    [fieldErrors, formId],
  )

  return {
    formRef,
    formError,
    fieldErrors,
    resetErrors,
    clearFieldError,
    reportErrors,
    getFieldProps,
    errorId: (fieldName: string) => fieldErrorId(formId, fieldName),
  }
}

export function AdminFormErrorSummary({
  message,
  className,
}: {
  message?: string
  className?: string
}) {
  if (!message) return null

  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive",
        className,
      )}
    >
      {message}
    </div>
  )
}

export function AdminFieldError({
  id,
  message,
  className,
}: {
  id: string
  message?: string
  className?: string
}) {
  if (!message) return null

  return (
    <p id={id} role="alert" className={cn("mt-1 text-xs text-destructive", className)}>
      {message}
    </p>
  )
}
