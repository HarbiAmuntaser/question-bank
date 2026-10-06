import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function source(path) {
  return readFileSync(path, "utf8");
}

test("admin content filters carry optional College through every list API", () => {
  const routeFiles = [
    "src/app/api/v1/admin/subjects/route.ts",
    "src/app/api/v1/admin/chapters/route.ts",
    "src/app/api/v1/admin/summaries/route.ts",
    "src/app/api/v1/admin/questions/route.ts",
  ];
  const validationFiles = [
    "src/validations/subject.ts",
    "src/validations/chapter.ts",
    "src/validations/study-summary.ts",
    "src/validations/question.ts",
  ];

  for (const file of [...routeFiles, ...validationFiles]) {
    assert.match(source(file), /collegeId/);
  }

  assert.match(source(routeFiles[0]), /major: { collegeId }/);
  assert.match(source(routeFiles[1]), /subject: { major: { collegeId } }/);
  assert.match(source(routeFiles[2]), /subject: { major: { collegeId } }/);
  assert.match(source(routeFiles[3]), /chapter: { subject: { major: { collegeId } } }/);
});

test("College remains optional and only appears for University institutions", () => {
  const sharedFilters = source("src/components/admin/admin-content-path-filters.tsx");
  const lookup = source("src/components/admin/admin-lookup-combobox.tsx");
  const dialogs = [
    "src/components/admin/majors/major-dialog.tsx",
    "src/components/admin/subjects/subject-dialog.tsx",
    "src/components/admin/chapters/chapter-dialog.tsx",
    "src/components/admin/summaries/summary-dialog.tsx",
    "src/components/admin/questions/question-dialog/QuestionCascader.tsx",
    "src/components/admin/questions/import-questions-dialog/ImportPathFields.tsx",
  ].map(source);

  assert.match(sharedFilters, /institutionType === "university"/);
  assert.match(sharedFilters, /type="college"/);
  assert.match(lookup, /collegeId/);
  assert.match(lookup, /searchMajorsAction\(\{ universityId, collegeId/);
  for (const dialog of dialogs) {
    assert.match(dialog, /type="college"/);
    assert.match(dialog, /institutionType/);
  }
});

test("quiz generator loads Chapters progressively with bounded queries", () => {
  const actions = source("src/app/admin/quiz-generator/actions.ts");
  const cascader = source("src/components/admin/quizzes/generator/ChapterCascader.tsx");
  const generator = source("src/components/admin/quizzes/generator/quiz-generator.tsx");
  const preview = source("src/app/api/v1/admin/quizzes/preview/route.ts");
  const quizRoute = source("src/app/api/v1/admin/quizzes/route.ts");
  const schema = source("src/validations/quiz.ts");
  const questionActions = source("src/app/admin/questions/actions.ts");

  assert.match(actions, /subjectId: args.subjectId/);
  assert.match(actions, /take: 50/);
  assert.match(cascader, /searchQuizGeneratorChaptersAction/);
  assert.match(cascader, /اختر الجهة والتخصص والمقرر لعرض الفصول/);
  assert.match(preview, /MAX_PREVIEW_QUESTIONS = 100/);
  assert.match(preview, /take: previewCount/);
  assert.match(quizRoute, /candidateCount/);
  assert.match(schema, /questionCount:[\s\S]*?max\(100\)/);
  assert.match(schema, /selectedChapters:[\s\S]*?max\(50\)/);

  for (const content of [generator, cascader, questionActions]) {
    assert.doesNotMatch(content, /10000|pageSize:\s*"1000"|getChaptersAction/);
  }
});

test("question list search and hierarchy stay server paginated", () => {
  const table = source("src/components/admin/questions/questions-table.tsx");
  const route = source("src/app/api/v1/admin/questions/route.ts");
  const validation = source("src/validations/question.ts");

  assert.match(table, /pageSize: perPage/);
  assert.match(table, /SearchInput/);
  assert.match(route, /questionText: { contains: query/);
  assert.match(validation, /query:/);
  assert.match(validation, /pageSize:[\s\S]*?max\(100\)/);
});
