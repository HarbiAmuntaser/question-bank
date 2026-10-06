import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(path, "utf8");
}

test("shared tables use logical alignment without forcing LTR", () => {
  const table = source("src/components/ui/table.tsx");

  assert.match(table, /h-12 px-4 text-start/);
  assert.match(table, /p-4 text-start/);
  assert.match(table, /\[&:has\(\[role=checkbox\]\)\]:pe-0/);
  assert.doesNotMatch(table, /h-12 px-4 text-left/);
});

test("dialog headers and controls follow document direction", () => {
  const dialog = source("src/components/ui/dialog.tsx");
  const alertDialog = source("src/components/ui/alert-dialog.tsx");

  for (const content of [dialog, alertDialog]) {
    assert.match(content, /text-start/);
    assert.doesNotMatch(content, /sm:text-left/);
    assert.match(content, /DialogLayerProvider/);
    assert.match(content, /flex-col-reverse gap-2 sm:flex-row sm:justify-end/);
  }
  assert.match(dialog, /absolute end-4 top-4/);
  assert.match(dialog, /<span className="sr-only">إغلاق<\/span>/);
});

test("nested select and popover content stays in the dialog interaction layer", () => {
  const popover = source("src/components/ui/popover.tsx");
  const select = source("src/components/ui/select.tsx");
  const context = source("src/components/ui/dialog-layer-context.tsx");

  assert.match(context, /React\.createContext\(false\)/);
  assert.match(popover, /disablePortal \|\| insideDialog \? content/);
  assert.match(popover, /PopoverPrimitive\.Portal/);
  assert.match(select, /insideDialog \? content : <SelectPrimitive\.Portal>/);
});

test("admin validation foundation exposes inline errors and accessible field state", () => {
  const validation = source("src/components/admin/admin-form-validation.tsx");
  const lookup = source("src/components/admin/seo/AsyncCombobox.tsx");
  const dialogs = [
    "src/components/admin/universities/university-dialog.tsx",
    "src/components/admin/colleges/college-dialog.tsx",
    "src/components/admin/majors/major-dialog.tsx",
    "src/components/admin/subjects/subject-dialog.tsx",
  ].map(source);

  assert.match(validation, /role="alert"/);
  assert.match(validation, /aria-invalid/);
  assert.match(validation, /focusFirstInvalidField/);
  assert.match(lookup, /data-admin-field/);
  assert.match(lookup, /aria-invalid=\{ariaInvalid\}/);
  for (const dialog of dialogs) {
    assert.match(dialog, /useAdminFormValidation/);
    assert.match(dialog, /AdminFormErrorSummary/);
    assert.match(dialog, /ref=\{validation\.formRef\}/);
  }
});

test("public RTL dialogs keep their explicit direction and no public table is changed directly", () => {
  const gate = source("src/components/public/subscription-gate-dialog.tsx");
  const resume = source("src/components/public/quiz/resume-attempt-dialog.tsx");
  const submission = source("src/components/public/quiz/quiz-submission-dialog.tsx");

  assert.match(gate, /<DialogContent[^>]*dir="rtl"/);
  assert.match(resume, /<AlertDialogContent[^>]*dir="rtl"/);
  assert.match(submission, /<AlertDialogContent[^>]*dir="rtl"/);
});
