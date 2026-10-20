import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("university cards hide internal university codes without changing other institution types", () => {
  const card = readFileSync("src/components/public/university-grid/institution-card.tsx", "utf8");

  assert.ok(card.includes('type !== "university" && code?.trim()'));
});

test("university details replace code and location with the independence notice", () => {
  const hero = readFileSync("src/components/public/university-hero.tsx", "utf8");

  assert.match(hero, /institutionType === "university"/);
  assert.match(hero, /المحتوى التعليمي والاختبارات من إعداد منصة مستواك المستقلة/);
  assert.match(hero, /{university.name} أو تمثلها رسميًا/);
  assert.match(hero, /institutionType === "university"[sS]*?: location || university.code?.trim()/);
});
