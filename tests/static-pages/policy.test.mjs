import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const pages = [
  ["about", "/public/about"],
  ["privacy", "/public/privacy"],
  ["terms", "/public/terms"],
  ["cookies", "/public/cookies"],
  ["content-policy", "/public/content-policy"],
  ["refund-policy", "/public/refund-policy"],
  ["faq", "/public/faq"],
  ["help", "/public/help"],
  ["contact", "/public/contact"],
];

const read = (path) => readFileSync(path, "utf8");

test("all nine trust pages are indexable with self-canonical metadata", () => {
  for (const [directory, route] of pages) {
    const path = `src/app/public/${directory}/page.tsx`;
    assert.equal(existsSync(path), true, `missing ${path}`);
    const source = read(path);
    assert.match(source, new RegExp(`canonical: ["']${route}["']`));
    assert.match(source, /robots:\s*\{\s*index:\s*true,\s*follow:\s*true\s*\}/);
  }
});

test("sitemap and footer expose the complete trust surface", () => {
  const sitemap = read("src/app/sitemap.ts");
  const footer = read("src/components/public/public-footer.tsx");

  for (const [, route] of pages) {
    assert.match(sitemap, new RegExp(`entry\\(["']${route}["']`));
  }

  for (const route of ["/public/about", "/public/content-policy", "/public/refund-policy"]) {
    assert.match(footer, new RegExp(`href: ["']${route}["']`));
  }
  assert.match(footer, /OFFICIAL_SUPPORT_EMAIL/);
});

test("published copy matches current runtime limits and approved trust decisions", () => {
  const privacy = read("src/app/public/privacy/page.tsx");
  const terms = read("src/app/public/terms/page.tsx");
  const cookies = read("src/app/public/cookies/page.tsx");
  const refund = read("src/app/public/refund-policy/page.tsx");
  const content = read("src/app/public/content-policy/page.tsx");
  const contact = read("src/app/public/contact/page.tsx");

  assert.match(privacy, /لا ترتبط هذه النتائج حاليًا بحساب الطالب ولا تتزامن بين أجهزته/);
  assert.match(privacy, /لا توجد حاليًا أداة حذف ذاتي/);
  assert.match(privacy, /Google AdSense غير مفعّل حاليًا/);
  assert.match(privacy, /لا تطبق حاليًا تحققًا آليًا من العمر/);
  assert.doesNotMatch(privacy, /نجمع بيانات تيليجرام|نحفظ بيانات تيليجرام/);

  assert.match(terms, /مشروع تعليمي شخصي مستقل/);
  assert.match(terms, /لا نضمن وجود فصل تجريبي لكل خطة/);
  assert.match(refund, /الاسترداد ليس آليًا/);
  assert.match(refund, /إجراء محاسبي يدوي موثق/);

  assert.match(cookies, /حتى 30 يومًا/);
  assert.match(cookies, /حتى سنة/);
  assert.match(cookies, /24 ساعة/);
  assert.match(cookies, /لا يتزامن حاليًا مع حساب الطالب/);

  assert.match(content, /ملفات مسربة أو مواد سرية أو بيانات طلاب/);
  assert.match(contact, /OFFICIAL_SUPPORT_EMAIL/);
});

test("official support email is centralized and obsolete placeholders are absent", () => {
  const config = read("src/config/public-support.ts");
  assert.match(config, /mustawak\.site@gmail\.com/);

  for (const [directory] of pages) {
    const source = read(`src/app/public/${directory}/page.tsx`);
    assert.doesNotMatch(source, /4 يونيو 2026|PRIVACY_REST|TERMS_REST|COOKIES_REST|FAQ_REST/);
  }
});
