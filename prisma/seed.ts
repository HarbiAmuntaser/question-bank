// prisma/seed.ts
/**
 * Seed Script
 * ===========
 * يضيف بيانات أولية (Admin + جامعات + تخصصات + مواد + فصول + أسئلة + خيارات)
 * ✅ Idempotent: يستخدم upsert حتى لا تتكرر البيانات عند إعادة التشغيل.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("بدء عملية إدخال البيانات الأولية...");

  // ---------------------------------------------------------------------------
  // 1) إنشاء / تحديث مستخدم المدير (Admin)
  // ---------------------------------------------------------------------------
  const adminEmail = "admin@saudibank.edu.sa";
  const adminPlainPassword = "admin123";
  const hashedPassword = await bcrypt.hash(adminPlainPassword, 12);

  /**
   * ✅ أهم إصلاح:
   * لازم نخزن ناتج upsert داخل متغير (adminUser)
   * لأننا نستخدم adminUser.id في createdBy لاحقاً
   */
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      // تحديثات آمنة (اختياري) حتى لو المستخدم موجود
      name: "مدير النظام",
      password: hashedPassword,
      role: "admin",
      isActive: true,
    },
    create: {
      id: "admin-001",
      name: "مدير النظام",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
      isActive: true,
    },
  });

  console.log("تم إنشاء/تحديث المستخدم المدير:", adminUser.email);

  // ---------------------------------------------------------------------------
  // 2) إدخال الجامعات (Universities)
  // ---------------------------------------------------------------------------
  const universities = [
    {
      id: "univ-001",
      name: "جامعة الملك سعود",
      code: "KSU",
      city: "الرياض",
      region: "المنطقة الوسطى",
      logoUrl: "https://www.ksu.edu.sa/sites/ksu.edu.sa/files/logo_ksu_0.png",
    },
    {
      id: "univ-002",
      name: "جامعة الملك عبدالعزيز",
      code: "KAU",
      city: "جدة",
      region: "المنطقة الغربية",
      logoUrl: "https://www.kau.edu.sa/Style%20Library/KAU/images/logo.png",
    },
    {
      id: "univ-003",
      name: "جامعة الملك فهد للبترول والمعادن",
      code: "KFUPM",
      city: "الظهران",
      region: "المنطقة الشرقية",
      logoUrl: "https://www.kfupm.edu.sa/Style%20Library/KFUPM/images/logo.png",
    },
    {
      id: "univ-004",
      name: "جامعة الأميرة نورة بنت عبدالرحمن",
      code: "PNU",
      city: "الرياض",
      region: "المنطقة الوسطى",
      logoUrl: "https://www.pnu.edu.sa/Style%20Library/PNU/images/logo.png",
    },
    {
      id: "univ-005",
      name: "جامعة الإمام محمد بن سعود الإسلامية",
      code: "IMSIU",
      city: "الرياض",
      region: "المنطقة الوسطى",
      logoUrl: "https://imamu.edu.sa/Style%20Library/IMAMU/images/logo.png",
    },
    {
      id: "univ-006",
      name: "جامعة أم القرى",
      code: "UQU",
      city: "مكة المكرمة",
      region: "المنطقة الغربية",
      logoUrl: "https://uqu.edu.sa/Style%20Library/UQU/images/logo.png",
    },
    {
      id: "univ-007",
      name: "الجامعة الإسلامية بالمدينة المنورة",
      code: "IU",
      city: "المدينة المنورة",
      region: "المنطقة الغربية",
      logoUrl: "https://iu.edu.sa/Style%20Library/IU/images/logo.png",
    },
    {
      id: "univ-008",
      name: "جامعة الملك خالد",
      code: "KKU",
      city: "أبها",
      region: "المنطقة الجنوبية",
      logoUrl: "https://www.kku.edu.sa/Style%20Library/KKU/images/logo.png",
    },
  ];

  for (const university of universities) {
    await prisma.university.upsert({
      where: { id: university.id },
      update: {
        // لو حبيت تحدث الاسم/الشعار عند إعادة تشغيل seed
        name: university.name,
        code: university.code,
        city: university.city,
        region: university.region,
        logoUrl: university.logoUrl,
        isActive: true,
      },
      create: {
        ...university,
        isActive: true,
        createdBy: adminUser.id,
        // ملاحظة:
        // countryCode & institutionType عندك لها defaults في schema،
        // لو تبغى تحددها صراحةً أضف:
        // countryCode: "SA",
        // institutionType: "university",
      },
    });
  }

  console.log("تم إدخال الجامعات بنجاح");

  // ---------------------------------------------------------------------------
  // 3) إدخال التخصصات (Majors)
  // ---------------------------------------------------------------------------
  const majors = [
    {
      id: "major-001",
      universityId: "univ-001",
      name: "علوم الحاسب",
      code: "CS",
      degreeType: "بكالوريوس",
      durationYears: 4,
    },
    {
      id: "major-002",
      universityId: "univ-001",
      name: "تقنية المعلومات",
      code: "IT",
      degreeType: "بكالوريوس",
      durationYears: 4,
    },
    {
      id: "major-003",
      universityId: "univ-002",
      name: "هندسة البرمجيات",
      code: "SE",
      degreeType: "بكالوريوس",
      durationYears: 4,
    },
    {
      id: "major-004",
      universityId: "univ-003",
      name: "هندسة الحاسب",
      code: "CE",
      degreeType: "بكالوريوس",
      durationYears: 4,
    },
    {
      id: "major-005",
      universityId: "univ-004",
      name: "نظم المعلومات",
      code: "IS",
      degreeType: "بكالوريوس",
      durationYears: 4,
    },
    {
      id: "major-006",
      universityId: "univ-001",
      name: "الذكاء الاصطناعي",
      code: "AI",
      degreeType: "بكالوريوس",
      durationYears: 4,
    },
    {
      id: "major-007",
      universityId: "univ-002",
      name: "أمن المعلومات",
      code: "CYBERSEC",
      degreeType: "بكالوريوس",
      durationYears: 4,
    },
  ];

  for (const major of majors) {
    await prisma.major.upsert({
      where: { id: major.id },
      update: {
        name: major.name,
        code: major.code,
        degreeType: major.degreeType,
        durationYears: major.durationYears,
        isActive: true,
      },
      create: {
        ...major,
        isActive: true,
        createdBy: adminUser.id,
      },
    });
  }

  console.log("تم إدخال التخصصات بنجاح");

  // ---------------------------------------------------------------------------
  // 4) إدخال المقررات (Subjects)
  // ---------------------------------------------------------------------------
  const subjects = [
    {
      id: "subj-001",
      majorId: "major-001",
      name: "أساسيات البرمجة",
      code: "CS101",
      creditHours: 3,
      semester: 1,
      year: 1,
      description: "مقدمة في البرمجة باستخدام لغة Python",
    },
    {
      id: "subj-002",
      majorId: "major-001",
      name: "هياكل البيانات",
      code: "CS201",
      creditHours: 3,
      semester: 1,
      year: 2,
      description: "دراسة هياكل البيانات الأساسية والخوارزميات",
    },
    {
      id: "subj-003",
      majorId: "major-001",
      name: "قواعد البيانات",
      code: "CS301",
      creditHours: 3,
      semester: 1,
      year: 3,
      description: "تصميم وإدارة قواعد البيانات العلائقية",
    },
    {
      id: "subj-004",
      majorId: "major-002",
      name: "تطوير الويب",
      code: "IT201",
      creditHours: 3,
      semester: 2,
      year: 2,
      description: "تطوير مواقع الويب باستخدام HTML, CSS, JavaScript",
    },
    {
      id: "subj-005",
      majorId: "major-003",
      name: "مبادئ هندسة البرمجيات",
      code: "SE301",
      creditHours: 3,
      semester: 1,
      year: 3,
      description: "مبادئ وممارسات هندسة البرمجيات",
    },
    {
      id: "subj-006",
      majorId: "major-001",
      name: "الخوارزميات المتقدمة",
      code: "CS401",
      creditHours: 3,
      semester: 1,
      year: 4,
      description: "خوارزميات متقدمة وتحليل التعقيد",
    },
  ];

  for (const subject of subjects) {
    await prisma.subject.upsert({
      where: { id: subject.id },
      update: {
        name: subject.name,
        code: subject.code,
        creditHours: subject.creditHours,
        semester: subject.semester,
        year: subject.year,
        description: subject.description,
        isActive: true,
      },
      create: {
        ...subject,
        isActive: true,
        createdBy: adminUser.id,
      },
    });
  }

  console.log("تم إدخال المقررات بنجاح");

  // ---------------------------------------------------------------------------
  // 5) إدخال الفصول (Chapters)
  // ---------------------------------------------------------------------------
  const chapters = [
    {
      id: "chap-001",
      subjectId: "subj-001",
      name: "مقدمة في البرمجة",
      chapterNumber: 1,
      description: "أساسيات البرمجة والمفاهيم الأولية",
      learningObjectives: ["فهم مفهوم البرمجة", "تعلم أساسيات لغة Python", "كتابة برامج بسيطة"],
    },
    {
      id: "chap-002",
      subjectId: "subj-001",
      name: "المتغيرات وأنواع البيانات",
      chapterNumber: 2,
      description: "التعرف على المتغيرات وأنواع البيانات المختلفة",
      learningObjectives: ["فهم مفهوم المتغيرات", "التعرف على أنواع البيانات", "استخدام المتغيرات في البرامج"],
    },
    {
      id: "chap-003",
      subjectId: "subj-002",
      name: "المصفوفات والقوائم",
      chapterNumber: 1,
      description: "دراسة المصفوفات والقوائم كهياكل بيانات أساسية",
      learningObjectives: ["فهم مفهوم المصفوفات", "التعامل مع القوائم", "العمليات الأساسية على المصفوفات"],
    },
    {
      id: "chap-004",
      subjectId: "subj-003",
      name: "مقدمة في قواعد البيانات",
      chapterNumber: 1,
      description: "أساسيات قواعد البيانات والنماذج العلائقية",
      learningObjectives: ["فهم مفهوم قواعد البيانات", "التعرف على النموذج العلائقي", "أساسيات SQL"],
    },
  ];

  for (const chapter of chapters) {
    await prisma.chapter.upsert({
      where: { id: chapter.id },
      update: {
        name: chapter.name,
        chapterNumber: chapter.chapterNumber,
        description: chapter.description,
        learningObjectives: chapter.learningObjectives,
        isActive: true,
      },
      create: {
        ...chapter,
        isActive: true,
        createdBy: adminUser.id,
      },
    });
  }

  console.log("تم إدخال الفصول بنجاح");

  // ---------------------------------------------------------------------------
  // 6) إدخال أسئلة تجريبية (Questions)
  // ---------------------------------------------------------------------------
  const questions = [
    {
      id: "quest-001",
      chapterId: "chap-001",
      questionText: "ما هي لغة البرمجة؟",
      questionType: "multiple_choice" as const,
      difficultyLevel: "easy" as const,
      points: 1,
      explanation: "لغة البرمجة هي مجموعة من القواعد والتعليمات المستخدمة لكتابة البرامج",
      tags: ["أساسيات", "مقدمة"],
    },
    {
      id: "quest-002",
      chapterId: "chap-002",
      questionText: "أي من التالي يعتبر نوع بيانات صحيح في Python؟",
      questionType: "multiple_choice" as const,
      difficultyLevel: "medium" as const,
      points: 2,
      explanation: "int, float, str, bool هي أنواع البيانات الأساسية في Python",
      tags: ["متغيرات", "أنواع البيانات"],
    },
    {
      id: "quest-003",
      chapterId: "chap-001",
      questionText: "Python هي لغة برمجة مفسرة",
      questionType: "true_false" as const,
      difficultyLevel: "easy" as const,
      points: 1,
      explanation: "صحيح، Python هي لغة مفسرة وليست مترجمة",
      tags: ["Python", "أساسيات"],
    },
  ];

  for (const question of questions) {
    await prisma.question.upsert({
      where: { id: question.id },
      update: {
        questionText: question.questionText,
        questionType: question.questionType,
        difficultyLevel: question.difficultyLevel,
        points: question.points,
        explanation: question.explanation,
        tags: question.tags,
        isActive: true,
      },
      create: {
        ...question,
        isActive: true,
        createdBy: adminUser.id,
      },
    });
  }

  console.log("تم إدخال الأسئلة بنجاح");

  // ---------------------------------------------------------------------------
  // 7) إدخال خيارات الأسئلة (QuestionOptions)
  // ---------------------------------------------------------------------------
  const questionOptions = [
    // خيارات السؤال الأول
    { id: "opt-001", questionId: "quest-001", optionText: "مجموعة من القواعد لكتابة البرامج", isCorrect: true, optionOrder: 1 },
    { id: "opt-002", questionId: "quest-001", optionText: "نوع من أنواع الحاسوب", isCorrect: false, optionOrder: 2 },
    { id: "opt-003", questionId: "quest-001", optionText: "برنامج لتشغيل الألعاب", isCorrect: false, optionOrder: 3 },
    { id: "opt-004", questionId: "quest-001", optionText: "نظام تشغيل", isCorrect: false, optionOrder: 4 },

    // خيارات السؤال الثاني
    { id: "opt-005", questionId: "quest-002", optionText: "int", isCorrect: true, optionOrder: 1 },
    { id: "opt-006", questionId: "quest-002", optionText: "string", isCorrect: false, optionOrder: 2 },
    { id: "opt-007", questionId: "quest-002", optionText: "number", isCorrect: false, optionOrder: 3 },
    { id: "opt-008", questionId: "quest-002", optionText: "char", isCorrect: false, optionOrder: 4 },
  ];

  for (const option of questionOptions) {
    await prisma.questionOption.upsert({
      where: { id: option.id },
      update: {
        optionText: option.optionText,
        isCorrect: option.isCorrect,
        optionOrder: option.optionOrder,
      },
      create: option,
    });
  }

  console.log("تم إدخال خيارات الأسئلة بنجاح");

  // ---------------------------------------------------------------------------
  console.log("تمت عملية إدخال البيانات الأولية بنجاح! 🎉");
  console.log("يمكنك الآن تسجيل الدخول باستخدام:");
  console.log("البريد الإلكتروني:", adminEmail);
  console.log("كلمة المرور:", adminPlainPassword);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("خطأ في إدخال البيانات:", e);
    await prisma.$disconnect();
    process.exit(1);
  });