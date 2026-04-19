type CachedMatchReport = {
  roomCode: string;
  winner: "red" | "blue";
  winReason: "hp_zero" | "time_up";
  teams: {
    red: { hpCurrent: number };
    blue: { hpCurrent: number };
  };
  totalCorrect: { red: number; blue: number };
  durationMs: number;
  finalEventLog: Array<{
    type?: string;
    text?: string;
    createdAt?: string;
    damage?: number;
  }>;
};

const STORAGE_KEY_PREFIX = "little-net-game:match-report:";

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

export function writeCachedMatchReport(matchId: string, report: CachedMatchReport) {
  const storage = getStorage();

  if (!storage || !matchId) {
    return;
  }

  storage.setItem(`${STORAGE_KEY_PREFIX}${matchId}`, JSON.stringify(report));
}

export function readCachedMatchReport(matchId: string): CachedMatchReport | null {
  const storage = getStorage();

  if (!storage || !matchId) {
    return null;
  }

  const raw = storage.getItem(`${STORAGE_KEY_PREFIX}${matchId}`);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CachedMatchReport;
  } catch {
    return null;
  }
}
