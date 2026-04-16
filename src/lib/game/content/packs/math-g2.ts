import type { ContentPack } from "@/lib/game/content/types";

// The starter pack is the first explicit catalog entry for grade-2 math content.
export const mathGrade2CorePack: ContentPack = {
  id: "math-g2-core",
  subject: "math",
  grade: "g2",
  title: "二年级数学基础包",
  questionTypes: ["single-number", "quotient-remainder"],
  evaluatorIds: ["math-single-number", "math-quotient-remainder"],
};
