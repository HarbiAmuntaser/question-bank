import type {
  DifficultyLevel,
  ImportIssue,
  ImportPreview,
  ImportQuestionType,
  NormalizedImportItem,
  NormalizedOption,
} from "./types";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function getBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "yes", "صح", "صحيح"].includes(normalized)) return true;
      if (["false", "no", "خطأ", "خطا", "خاطئ"].includes(normalized)) return false;
    }
  }
  return undefined;
}

function normalizeDifficulty(value: unknown): DifficultyLevel {
  if (typeof value !== "string") return "medium";
  const normalized = value.trim().toLowerCase();
  if (["easy", "سهل", "بسيط"].includes(normalized)) return "easy";
  if (["hard", "صعب"].includes(normalized)) return "hard";
  return "medium";
}

function normalizePoints(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value.trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }
  return 1;
}

function normalizeTags(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/[,،]/)
      .map((tag) => tag.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeImageUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const imageUrl = value.trim();
  try {
    new URL(imageUrl);
    return imageUrl;
  } catch {
    return "invalid";
  }
}

function questionKey(text: string) {
  return text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function normalizeQuestionType(record: Record<string, unknown>): ImportQuestionType {
  const raw = getString(record, ["questionType", "type", "kind", "نوع"]);
  const normalized = raw?.toLowerCase().replace(/[-\s]/g, "_");
  if (normalized && ["true_false", "tf", "boolean", "صح_خطأ", "صح_خطا"].includes(normalized)) return "true_false";
  if (record.tfAnswer !== undefined) return "true_false";
  return "multiple_choice";
}

function stripCodeFence(text: string) {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json|jsonl)?\s*([\s\S]*?)\s*```$/i);
  return (match?.[1] ?? trimmed).trim();
}

function parseRawQuestions(text: string): { rows: unknown[]; errors: ImportIssue[] } {
  const normalized = stripCodeFence(text);
  if (!normalized) return { rows: [], errors: [{ message: "ألصق JSON يحتوي على أسئلة أولًا." }] };

  if (normalized.startsWith("[") || normalized.startsWith("{")) {
    try {
      const parsed = JSON.parse(normalized) as unknown;
      if (Array.isArray(parsed)) return { rows: parsed, errors: [] };
      if (isRecord(parsed)) {
        const nested = parsed.questions ?? parsed.items ?? parsed.data;
        if (Array.isArray(nested)) return { rows: nested, errors: [] };
      }
      return { rows: [], errors: [{ message: "صيغة JSON يجب أن تكون مصفوفة أو كائنًا يحتوي questions/items/data." }] };
    } catch (error) {
      return {
        rows: [],
        errors: [{ message: error instanceof Error ? `JSON غير صالح: ${error.message}` : "JSON غير صالح." }],
      };
    }
  }

  const rows: unknown[] = [];
  const errors: ImportIssue[] = [];
  normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .forEach((line, index) => {
      if (!line) return;
      try {
        rows.push(JSON.parse(line) as unknown);
      } catch (error) {
        errors.push({
          index: index + 1,
          message: error instanceof Error ? `سطر JSONL غير صالح: ${error.message}` : "سطر JSONL غير صالح.",
        });
      }
    });

  return { rows, errors };
}

function getAnswerSource(record: Record<string, unknown>) {
  return record.correctAnswer ?? record.answer ?? record.correct ?? record.correctOption ?? record.correctIndex;
}

function isAnswerMatch(answer: unknown, option: { text: string; key?: string }, index: number) {
  if (typeof answer === "number") return answer === index || answer === index + 1;
  if (typeof answer !== "string") return false;
  const normalized = answer.trim().toLowerCase();
  const optionText = option.text.trim().toLowerCase();
  const optionKey = option.key?.trim().toLowerCase();
  const latinLetter = String.fromCharCode(97 + index);
  const arabicLetters = ["أ", "ب", "ج", "د", "هـ", "و"];
  return normalized === optionText || normalized === optionKey || normalized === latinLetter || normalized === arabicLetters[index];
}

function normalizeOptions(record: Record<string, unknown>): NormalizedOption[] {
  const rawOptions = record.options ?? record.choices ?? record.answers;
  if (!Array.isArray(rawOptions)) return [];
  const answer = getAnswerSource(record);

  return rawOptions
    .map((raw, index): NormalizedOption | null => {
      if (typeof raw === "string") return { text: raw.trim(), isCorrect: isAnswerMatch(answer, { text: raw }, index) };
      if (!isRecord(raw)) return null;

      const text = getString(raw, ["text", "optionText", "label", "value", "answer"]);
      if (!text) return null;

      const key = getString(raw, ["key", "id", "letter"]);
      const explicitCorrect = getBoolean(raw, ["isCorrect", "correct"]);
      return { text, isCorrect: explicitCorrect ?? isAnswerMatch(answer, { text, key }, index) };
    })
    .filter((option): option is NormalizedOption => Boolean(option));
}

function normalizeTrueFalseAnswer(record: Record<string, unknown>) {
  return getBoolean(record, ["tfAnswer", "correctAnswer", "answer", "correct"]);
}

function normalizeItem(raw: unknown, index: number): { item?: NormalizedImportItem; errors: ImportIssue[] } {
  const errors: ImportIssue[] = [];
  if (!isRecord(raw)) return { errors: [{ index, message: "كل سؤال يجب أن يكون كائن JSON." }] };

  const questionText = getString(raw, ["questionText", "question", "text", "prompt", "السؤال"]);
  if (!questionText) errors.push({ index, message: "نص السؤال مفقود." });

  const questionType = normalizeQuestionType(raw);
  const difficultyLevel = normalizeDifficulty(raw.difficultyLevel ?? raw.difficulty ?? raw.level);
  const points = normalizePoints(raw.points ?? raw.score ?? raw.mark);
  const imageUrl = normalizeImageUrl(raw.imageUrl ?? raw.image);
  const tags = normalizeTags(raw.tags ?? raw.keywords ?? raw.categories);
  const explanation = getString(raw, ["explanation", "answerExplanation", "rationale", "تفسير"]) ?? null;
  const isActive = getBoolean(raw, ["isActive"]);
  if (imageUrl === "invalid") errors.push({ index, message: "imageUrl غير صالح." });

  if (questionType === "true_false") {
    const tfAnswer = normalizeTrueFalseAnswer(raw);
    if (tfAnswer === undefined) errors.push({ index, message: "سؤال صح/خطأ يحتاج tfAnswer بقيمة true أو false." });
    if (errors.length || tfAnswer === undefined || !questionText) return { errors };
    return { item: { sourceIndex: index, questionText, questionType, difficultyLevel, points, explanation, imageUrl, tags, isActive, tfAnswer }, errors };
  }

  const options = normalizeOptions(raw);
  const correctCount = options.filter((option) => option.isCorrect).length;
  if (options.length < 2) errors.push({ index, message: "سؤال الاختيار المتعدد يحتاج خيارين على الأقل." });
  if (correctCount !== 1) errors.push({ index, message: "سؤال الاختيار المتعدد يحتاج إجابة صحيحة واحدة فقط." });
  if (errors.length || !questionText) return { errors };

  return { item: { sourceIndex: index, questionText, questionType, difficultyLevel, points, explanation, imageUrl, tags, isActive, options }, errors };
}

export function buildPreview(text: string): ImportPreview {
  const parsed = parseRawQuestions(text);
  const items: NormalizedImportItem[] = [];
  const errors = [...parsed.errors];
  const warnings: ImportIssue[] = [];

  parsed.rows.forEach((row, index) => {
    const normalized = normalizeItem(row, index + 1);
    if (normalized.item) items.push(normalized.item);
    errors.push(...normalized.errors);
  });

  const firstByKey = new Map<string, number>();
  items.forEach((item) => {
    const key = questionKey(item.questionText);
    const firstIndex = firstByKey.get(key);
    if (firstIndex !== undefined) {
      warnings.push({ index: item.sourceIndex, message: `سؤال مكرر داخل JSON. أول ظهور في السؤال ${firstIndex}.` });
    } else {
      firstByKey.set(key, item.sourceIndex);
    }
  });

  return {
    sourceText: text,
    items,
    errors,
    warnings,
    summary: {
      total: items.length,
      multipleChoice: items.filter((item) => item.questionType === "multiple_choice").length,
      trueFalse: items.filter((item) => item.questionType === "true_false").length,
      easy: items.filter((item) => item.difficultyLevel === "easy").length,
      medium: items.filter((item) => item.difficultyLevel === "medium").length,
      hard: items.filter((item) => item.difficultyLevel === "hard").length,
      withExplanation: items.filter((item) => Boolean(item.explanation)).length,
      withTags: items.filter((item) => item.tags && item.tags.length > 0).length,
      withImage: items.filter((item) => Boolean(item.imageUrl)).length,
      duplicateInFile: warnings.length,
      totalPoints: items.reduce((sum, item) => sum + item.points, 0),
    },
  };
}
