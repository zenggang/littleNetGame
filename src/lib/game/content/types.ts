// SubjectCode identifies the learning domain exposed to rooms and matches.
export type SubjectCode = "math" | "chinese" | "english";

// GradeCode keeps content packs scoped to the supported elementary grades.
export type GradeCode = "g2" | "g3" | "g4";

// InputSchema describes the answer UI contract a question expects.
export type InputSchema =
  | "single-number"
  | "quotient-remainder"
  | "single-choice";

// EvaluatorId keeps content packs linked to the supported answer evaluators.
export type EvaluatorId = "math-single-number" | "math-quotient-remainder";

// ContentPack is the shared catalog contract consumed by room presets and gameplay.
export type ContentPack = {
  id: string;
  subject: SubjectCode;
  grade: GradeCode;
  title: string;
  questionTypes: InputSchema[];
  evaluatorIds: EvaluatorId[];
};

// RoomPreset captures the default room setup that points at a content pack and ruleset.
export type RoomPreset = {
  subject: SubjectCode;
  grade: GradeCode;
  contentPackId: string;
  rulesetId: string;
};
