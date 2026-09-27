export type ChapterKindItem = { kind: "theory" | "practical" };

export function groupChaptersByKind<T extends ChapterKindItem>(chapters: T[]) {
  return {
    theory: chapters.filter((chapter) => chapter.kind === "theory"),
    practical: chapters.filter((chapter) => chapter.kind === "practical"),
  };
}
