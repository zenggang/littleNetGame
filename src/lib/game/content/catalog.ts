import { mathGrade2CorePack } from "@/lib/game/content/packs/math-g2";
import type { ContentPack, RoomPreset } from "@/lib/game/content/types";

// Keep the catalog explicit so the first shipped pack is easy to audit and extend.
const packs: Record<string, ContentPack> = {
  [mathGrade2CorePack.id]: mathGrade2CorePack,
};

// Room presets describe the default subject/grade pairing exposed to the lobby.
const presets: RoomPreset[] = [
  {
    subject: "math",
    grade: "g2",
    contentPackId: "math-g2-core",
    rulesetId: "classic-archer-v1",
  },
];

export function listRoomPresets() {
  return presets;
}

export function getContentPack(contentPackId: string) {
  const pack = packs[contentPackId];

  if (!pack) {
    throw new Error(`Unknown content pack: ${contentPackId}`);
  }

  return pack;
}
