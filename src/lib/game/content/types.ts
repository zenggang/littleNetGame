export type SubjectCode = "math" | "chinese" | "english";
export type GradeCode = "g2" | "g3" | "g4";
export type InputSchema = "single-number" | "quotient-remainder" | "single-choice";

export type ContentPack = {
  id: string;
  subject: SubjectCode;
  grade: GradeCode;
  title: string;
  questionTypes: InputSchema[];
  evaluatorIds: string[];
};

export type RoomPreset = {
  subject: SubjectCode;
  grade: GradeCode;
  contentPackId: string;
  rulesetId: string;
};
