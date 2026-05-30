export const IMPORT_CHUNK_SIZE = 100;

export const IMPORT_TEMPLATE = `[
  {
    "questionText": "ما المفهوم الرئيسي في هذا الجزء؟",
    "questionType": "multiple_choice",
    "difficultyLevel": "medium",
    "points": 1,
    "explanation": "التفسير المختصر للإجابة الصحيحة.",
    "options": [
      { "text": "الخيار الصحيح", "isCorrect": true },
      { "text": "خيار غير صحيح", "isCorrect": false },
      { "text": "خيار غير صحيح", "isCorrect": false },
      { "text": "خيار غير صحيح", "isCorrect": false }
    ]
  },
  {
    "questionText": "العبارة التالية صحيحة أو خاطئة؟",
    "questionType": "true_false",
    "difficultyLevel": "easy",
    "points": 1,
    "explanation": "سبب كون العبارة صحيحة أو خاطئة.",
    "tfAnswer": true
  }
]`;
