# Pure Game Core Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current Next.js + Supabase prototype into a mobile-first game shell with a Phaser battle runtime and a Cloudflare Durable Objects coordinator, while preserving Supabase for identity, content persistence, match reports, and recovery.

**Architecture:** Keep the existing Next.js app as the product shell, land the UI rewrite before the realtime migration, and introduce a shared protocol layer in `src/lib/game` so the Next client, the battle runtime, and the coordinator all consume the same event model. Use a top-level `realtime-worker/` directory instead of a full monorepo because the milestones are sequential and tightly coupled, but keep the worker isolated from the Next runtime.

**Tech Stack:** Next.js 16, React 19, TypeScript, Phaser, Vitest, React Testing Library, Supabase, Cloudflare Workers + Durable Objects, Wrangler

---

## Scope Note

The approved spec spans four tightly coupled milestones:

- game shell rebuild
- battle runtime rebuild
- realtime coordinator rebuild
- result/reporting/verification

These are not independent enough to justify four disconnected plans, because they share the same protocol, content model, and persistence changes. This document is therefore a single master plan, but each task still produces working, testable software on its own.

## Target Repository Shape

### Existing files to preserve and adapt

- `src/app/page.tsx`
- `src/app/page.module.css`
- `src/app/room/[code]/page.tsx`
- `src/app/room/[code]/page.module.css`
- `src/app/battle/[matchId]/page.tsx`
- `src/app/battle/[matchId]/page.module.css`
- `src/app/result/[matchId]/page.tsx`
- `src/app/result/[matchId]/page.module.css`
- `src/app/globals.css`
- `src/lib/game/config.ts`
- `src/lib/game/questions.ts`
- `src/lib/game/match.ts`
- `src/lib/game/types.ts`
- `src/lib/supabase/game-store.ts`
- `supabase/migrations/*.sql`
- `package.json`
- `.env.example`
- `.gitignore`

### New Next-side files

- `vitest.config.ts`
- `vitest.setup.ts`
- `src/lib/server/coordinator-env.ts`
- `src/lib/server/coordinator-ticket.ts`
- `src/app/api/coordinator-ticket/route.ts`
- `src/lib/game/content/types.ts`
- `src/lib/game/content/catalog.ts`
- `src/lib/game/content/packs/math-g2.ts`
- `src/lib/game/evaluators/index.ts`
- `src/lib/game/protocol/events.ts`
- `src/lib/game/protocol/state.ts`
- `src/lib/game/protocol/reducer.ts`
- `src/lib/game/protocol/from-supabase-snapshot.ts`
- `src/lib/game/client/coordinator-client.ts`
- `src/lib/game/client/use-room-session.ts`
- `src/lib/game/client/use-match-session.ts`
- `src/components/game-shell/GameEntryModal.tsx`
- `src/components/game-shell/GameHallScreen.tsx`
- `src/components/game-shell/RoomPrepScreen.tsx`
- `src/components/battle-runtime/build-battle-view-model.ts`
- `src/components/battle-runtime/BattleHud.tsx`
- `src/components/battle-runtime/PhaserBattleStage.tsx`
- `src/components/battle-runtime/scenes/BattleScene.ts`

### New worker-side files

- `realtime-worker/wrangler.jsonc`
- `realtime-worker/vitest.config.ts`
- `realtime-worker/.dev.vars.example`
- `realtime-worker/src/index.ts`
- `realtime-worker/src/durable-objects/MatchRoom.ts`
- `realtime-worker/src/lib/room-engine.ts`
- `realtime-worker/src/lib/match-engine.ts`
- `realtime-worker/src/lib/persistence.ts`
- `realtime-worker/src/lib/supabase-admin.ts`

### New test files

- `src/lib/server/coordinator-env.test.ts`
- `src/lib/game/content/catalog.test.ts`
- `src/lib/game/protocol/reducer.test.ts`
- `src/components/game-shell/GameHallScreen.test.tsx`
- `src/components/game-shell/RoomPrepScreen.test.tsx`
- `src/components/battle-runtime/build-battle-view-model.test.ts`
- `src/lib/server/coordinator-ticket.test.ts`
- `realtime-worker/test/room-engine.test.ts`
- `realtime-worker/test/match-engine.test.ts`
- `src/lib/game/client/use-room-session.test.ts`
- `src/lib/game/client/use-match-session.test.ts`
- `src/lib/game/result/match-report.test.ts`

### New migrations

- `supabase/migrations/202604160001_add_content_catalog.sql`
- `supabase/migrations/202604160002_add_match_reports.sql`

## Task 1: Establish Test and Environment Scaffolding

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Modify: `.gitignore`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `src/lib/server/coordinator-env.ts`
- Test: `src/lib/server/coordinator-env.test.ts`

- [ ] **Step 1: Write the failing environment test**

```ts
import { describe, expect, it } from "vitest";

import { readCoordinatorEnv } from "@/lib/server/coordinator-env";

describe("readCoordinatorEnv", () => {
  it("returns the private coordinator configuration", () => {
    const env = readCoordinatorEnv({
      COORDINATOR_BASE_URL: "https://coordinator.example.com",
      COORDINATOR_SHARED_SECRET: "super-secret-value",
    });

    expect(env.baseUrl).toBe("https://coordinator.example.com");
    expect(env.sharedSecret).toBe("super-secret-value");
  });

  it("throws when a required value is missing", () => {
    expect(() =>
      readCoordinatorEnv({
        COORDINATOR_BASE_URL: "https://coordinator.example.com",
      }),
    ).toThrow("Missing COORDINATOR_SHARED_SECRET");
  });
});
```

- [ ] **Step 2: Run the new test and verify it fails**

Run: `npx vitest run src/lib/server/coordinator-env.test.ts`

Expected: FAIL with `Failed to resolve import "@/lib/server/coordinator-env"` or `Cannot find module`.

- [ ] **Step 3: Add the test runner, battle/runtime deps, and private env entries**

```json
{
  "scripts": {
    "lint": "eslint .",
    "test": "npm run test:legacy",
    "test:legacy": "tsx --test src/lib/**/*.test.ts",
    "test:unit": "vitest run",
    "test:all": "npm run test:legacy && npm run test:unit"
  },
  "dependencies": {
    "phaser": "^3.90.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.2.0",
    "@testing-library/user-event": "^14.6.1",
    "@vitest/coverage-v8": "^3.2.4",
    "jsdom": "^26.0.0",
    "tsx": "^4.20.3",
    "vitest": "^3.2.4",
    "wrangler": "^4.13.2",
    "@cloudflare/vitest-pool-workers": "^0.8.20"
  }
}
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
COORDINATOR_BASE_URL=
COORDINATOR_SHARED_SECRET=
```

```gitignore
.wrangler/
.dev.vars
.dev.vars.*
```

- [ ] **Step 4: Create the Vitest config and setup files**

```ts
// vitest.config.ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

```ts
// vitest.setup.ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Implement the coordinator env reader**

```ts
// src/lib/server/coordinator-env.ts
type CoordinatorEnv = {
  baseUrl: string;
  sharedSecret: string;
};

export function readCoordinatorEnv(
  env: Record<string, string | undefined> = process.env,
): CoordinatorEnv {
  const baseUrl = env.COORDINATOR_BASE_URL;
  const sharedSecret = env.COORDINATOR_SHARED_SECRET;

  if (!baseUrl) {
    throw new Error("Missing COORDINATOR_BASE_URL");
  }

  if (!sharedSecret) {
    throw new Error("Missing COORDINATOR_SHARED_SECRET");
  }

  return { baseUrl, sharedSecret };
}
```

- [ ] **Step 6: Run the new unit test, lint, and existing legacy tests**

Run: `npx vitest run src/lib/server/coordinator-env.test.ts && npm run lint && npm run test:legacy`

Expected:
- `coordinator-env.test.ts` PASS
- `eslint` PASS
- existing `src/lib/**/*.test.ts` PASS

- [ ] **Step 7: Commit the scaffolding**

```bash
git add package.json .env.example .gitignore vitest.config.ts vitest.setup.ts src/lib/server/coordinator-env.ts src/lib/server/coordinator-env.test.ts
git commit -m "chore: add test and coordinator env scaffolding"
```

## Task 2: Add the Content Catalog and Evaluator Contracts

**Files:**
- Create: `supabase/migrations/202604160001_add_content_catalog.sql`
- Create: `src/lib/game/content/types.ts`
- Create: `src/lib/game/content/catalog.ts`
- Create: `src/lib/game/content/packs/math-g2.ts`
- Create: `src/lib/game/evaluators/index.ts`
- Modify: `src/lib/game/types.ts`
- Modify: `vitest.config.ts`
- Test: `src/lib/game/content/catalog.test.ts`

- [ ] **Step 1: Write the failing content catalog test**

```ts
import { describe, expect, it } from "vitest";

import { getContentPack, listRoomPresets } from "@/lib/game/content/catalog";
import { evaluateAnswer } from "@/lib/game/evaluators";

describe("content catalog", () => {
  it("exposes the grade-2 math starter pack and matching evaluator", () => {
    const preset = listRoomPresets()[0];
    const pack = getContentPack(preset.contentPackId);

    expect(preset.subject).toBe("math");
    expect(pack.grade).toBe("g2");
    expect(pack.questionTypes).toEqual([
      "single-number",
      "quotient-remainder",
    ]);
    expect(
      evaluateAnswer("math-single-number", { value: "42" }, { value: 42 }),
    ).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npx vitest run src/lib/game/content/catalog.test.ts`

Expected: FAIL with unresolved `catalog` and `evaluators` modules.

- [ ] **Step 3: Add the Supabase migration for content metadata**

```sql
-- supabase/migrations/202604160001_add_content_catalog.sql
create table if not exists public.content_packs (
  id text primary key,
  subject_code text not null check (subject_code in ('math', 'chinese', 'english')),
  grade_code text not null check (grade_code in ('g2', 'g3', 'g4')),
  title text not null,
  question_types text[] not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.rooms
  add column if not exists subject_code text not null default 'math',
  add column if not exists grade_code text not null default 'g2',
  add column if not exists content_pack_id text not null default 'math-g2-core',
  add column if not exists ruleset_id text not null default 'classic-archer-v1';

alter table public.matches
  add column if not exists subject_code text not null default 'math',
  add column if not exists grade_code text not null default 'g2',
  add column if not exists content_pack_id text not null default 'math-g2-core',
  add column if not exists ruleset_id text not null default 'classic-archer-v1';

insert into public.content_packs (id, subject_code, grade_code, title, question_types)
values ('math-g2-core', 'math', 'g2', '二年级数学基础包', array['single-number', 'quotient-remainder'])
on conflict (id) do nothing;
```

- [ ] **Step 4: Create the shared content types and starter pack**

```ts
// src/lib/game/content/types.ts
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
```

```ts
// src/lib/game/content/packs/math-g2.ts
import type { ContentPack } from "@/lib/game/content/types";

export const mathGrade2CorePack: ContentPack = {
  id: "math-g2-core",
  subject: "math",
  grade: "g2",
  title: "二年级数学基础包",
  questionTypes: ["single-number", "quotient-remainder"],
  evaluatorIds: ["math-single-number", "math-quotient-remainder"],
};
```

- [ ] **Step 5: Create the catalog and evaluator registry**

```ts
// src/lib/game/content/catalog.ts
import { mathGrade2CorePack } from "@/lib/game/content/packs/math-g2";
import type { ContentPack, RoomPreset } from "@/lib/game/content/types";

const packs: Record<string, ContentPack> = {
  [mathGrade2CorePack.id]: mathGrade2CorePack,
};

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
```

```ts
// src/lib/game/evaluators/index.ts
type Evaluator = (
  answer: Record<string, string | number | undefined>,
  correctAnswer: Record<string, unknown>,
) => boolean;

const evaluators: Record<string, Evaluator> = {
  "math-single-number": (answer, correctAnswer) =>
    Number(answer.value) === Number(correctAnswer.value),
  "math-quotient-remainder": (answer, correctAnswer) =>
    Number(answer.quotient) === Number(correctAnswer.quotient) &&
    Number(answer.remainder) === Number(correctAnswer.remainder),
};

export function evaluateAnswer(
  evaluatorId: string,
  answer: Record<string, string | number | undefined>,
  correctAnswer: Record<string, unknown>,
) {
  const evaluator = evaluators[evaluatorId];

  if (!evaluator) {
    throw new Error(`Unknown evaluator: ${evaluatorId}`);
  }

  return evaluator(answer, correctAnswer);
}
```

- [ ] **Step 5.5: Extend Vitest discovery for content-layer tests only**

```ts
// vitest.config.ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/lib/server/**/*.test.ts",
      "src/lib/game/content/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 6: Run the catalog test and existing question tests**

Run: `npx vitest run src/lib/game/content/catalog.test.ts && npm run test:legacy -- src/lib/game/questions.test.ts`

Expected:
- `catalog.test.ts` PASS
- current `questions.test.ts` PASS

- [ ] **Step 7: Commit the content contracts**

```bash
git add supabase/migrations/202604160001_add_content_catalog.sql src/lib/game/content/types.ts src/lib/game/content/catalog.ts src/lib/game/content/packs/math-g2.ts src/lib/game/evaluators/index.ts src/lib/game/types.ts src/lib/game/content/catalog.test.ts vitest.config.ts
git commit -m "feat: add content catalog and evaluator contracts"
```

## Task 3: Introduce the Shared Match Event Protocol and Reducer

**Files:**
- Create: `src/lib/game/protocol/events.ts`
- Create: `src/lib/game/protocol/state.ts`
- Create: `src/lib/game/protocol/reducer.ts`
- Create: `src/lib/game/protocol/from-supabase-snapshot.ts`
- Modify: `vitest.config.ts`
- Test: `src/lib/game/protocol/reducer.test.ts`

- [ ] **Step 1: Write the failing reducer test**

```ts
import { describe, expect, it } from "vitest";

import { reduceMatchEvent } from "@/lib/game/protocol/reducer";
import { createEmptyMatchState } from "@/lib/game/protocol/state";

describe("reduceMatchEvent", () => {
  it("opens a question and resolves an attack in sequence order", () => {
    let state = createEmptyMatchState();

    state = reduceMatchEvent(state, {
      seq: 1,
      type: "match.question_opened",
      serverTime: 1_716_000_000_000,
      payload: {
        question: {
          id: "q-1",
          prompt: "27 + 16 = ?",
          inputSchema: "single-number",
          damage: 10,
          deadlineAt: "2026-04-16T10:00:08.000Z",
        },
      },
    });

    state = reduceMatchEvent(state, {
      seq: 2,
      type: "match.answer_resolved",
      serverTime: 1_716_000_000_500,
      payload: {
        attackerTeam: "red",
        targetTeam: "blue",
        damage: 10,
        hp: { red: 100, blue: 90 },
      },
    });

    expect(state.currentQuestion?.id).toBe("q-1");
    expect(state.teams.blue.hpCurrent).toBe(90);
    expect(state.lastSeq).toBe(2);
  });
});
```

- [ ] **Step 2: Run the reducer test and verify it fails**

Run: `npx vitest run src/lib/game/protocol/reducer.test.ts`

Expected: FAIL with unresolved protocol modules.

- [ ] **Step 3: Create the event and state contracts**

```ts
// src/lib/game/protocol/events.ts
import type { InputSchema } from "@/lib/game/content/types";
import type { TeamName } from "@/lib/game/types";

export type MatchEvent =
  | {
      seq: number;
      type: "match.question_opened";
      serverTime: number;
      payload: {
        question: {
          id: string;
          prompt: string;
          inputSchema: InputSchema;
          damage: number;
          deadlineAt: string;
        };
      };
    }
  | {
      seq: number;
      type: "match.answer_resolved";
      serverTime: number;
      payload: {
        attackerTeam: TeamName;
        targetTeam: TeamName;
        damage: number;
        hp: Record<TeamName, number>;
      };
    }
  | {
      seq: number;
      type: "match.finished";
      serverTime: number;
      payload: {
        winner: TeamName;
        reason: "hp_zero" | "time_up";
      };
    };
```

```ts
// src/lib/game/protocol/state.ts
import type { InputSchema } from "@/lib/game/content/types";
import type { TeamName } from "@/lib/game/types";

export type MatchState = {
  lastSeq: number;
  phase: "idle" | "countdown" | "active" | "finished";
  currentQuestion: null | {
    id: string;
    prompt: string;
    inputSchema: InputSchema;
    damage: number;
    deadlineAt: string;
  };
  teams: Record<TeamName, { hpCurrent: number; hpMax: number }>;
  winner: TeamName | null;
};

export function createEmptyMatchState(): MatchState {
  return {
    lastSeq: 0,
    phase: "idle",
    currentQuestion: null,
    teams: {
      red: { hpCurrent: 100, hpMax: 100 },
      blue: { hpCurrent: 100, hpMax: 100 },
    },
    winner: null,
  };
}
```

- [ ] **Step 4: Implement the reducer and the snapshot adapter**

```ts
// src/lib/game/protocol/reducer.ts
import type { MatchEvent } from "@/lib/game/protocol/events";
import type { MatchState } from "@/lib/game/protocol/state";

export function reduceMatchEvent(state: MatchState, event: MatchEvent): MatchState {
  if (event.seq <= state.lastSeq) {
    return state;
  }

  if (event.type === "match.question_opened") {
    return {
      ...state,
      lastSeq: event.seq,
      phase: "active",
      currentQuestion: event.payload.question,
    };
  }

  if (event.type === "match.answer_resolved") {
    return {
      ...state,
      lastSeq: event.seq,
      teams: {
        red: { ...state.teams.red, hpCurrent: event.payload.hp.red },
        blue: { ...state.teams.blue, hpCurrent: event.payload.hp.blue },
      },
    };
  }

  return {
    ...state,
    lastSeq: event.seq,
    phase: "finished",
    winner: event.payload.winner,
  };
}
```

```ts
// src/lib/game/protocol/from-supabase-snapshot.ts
import type { MatchState } from "@/lib/game/protocol/state";

export function matchStateFromSnapshot(snapshot: {
  match: {
    phase: "countdown" | "active" | "finished";
    currentQuestion: {
      key: string;
      prompt: string;
      answerKind: "single-number" | "quotient-remainder";
      damage: number;
    };
    questionDeadlineAt: string;
    teams: {
      red: { hpCurrent: number; hpMax: number };
      blue: { hpCurrent: number; hpMax: number };
    };
    winner: "red" | "blue" | null;
  };
}): MatchState {
  return {
    lastSeq: 0,
    phase: snapshot.match.phase,
    currentQuestion: {
      id: snapshot.match.currentQuestion.key,
      prompt: snapshot.match.currentQuestion.prompt,
      inputSchema: snapshot.match.currentQuestion.answerKind,
      damage: snapshot.match.currentQuestion.damage,
      deadlineAt: snapshot.match.questionDeadlineAt,
    },
    teams: snapshot.match.teams,
    winner: snapshot.match.winner,
  };
}
```

- [ ] **Step 4.5: Extend Vitest discovery for protocol-layer tests only**

```ts
// vitest.config.ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/lib/server/**/*.test.ts",
      "src/lib/game/content/**/*.test.ts",
      "src/lib/game/protocol/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 5: Run the reducer test and legacy match tests**

Run: `npx vitest run src/lib/game/protocol/reducer.test.ts && npm run test:legacy -- src/lib/game/match.test.ts`

Expected:
- reducer test PASS
- legacy match tests PASS

- [ ] **Step 6: Commit the shared protocol**

```bash
git add src/lib/game/protocol/events.ts src/lib/game/protocol/state.ts src/lib/game/protocol/reducer.ts src/lib/game/protocol/from-supabase-snapshot.ts src/lib/game/protocol/reducer.test.ts vitest.config.ts
git commit -m "feat: add shared match protocol and reducer"
```

## Task 4: Rebuild the Hall Screen and Entry Modal

**Files:**
- Create: `src/components/game-shell/GameEntryModal.tsx`
- Create: `src/components/game-shell/GameHallScreen.tsx`
- Create: `src/app/page.test.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/page.module.css`
- Modify: `src/app/globals.css`
- Modify: `vitest.config.ts`
- Test: `src/components/game-shell/GameHallScreen.test.tsx`

- [ ] **Step 1: Write the failing hall screen test**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GameHallScreen } from "@/components/game-shell/GameHallScreen";

describe("GameHallScreen", () => {
  it("opens the join modal from the main lobby action", async () => {
    const user = userEvent.setup();

    render(
      <GameHallScreen
        nickname="阿杰"
        onNicknameChange={vi.fn()}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "加入游戏" }));

    expect(screen.getByRole("dialog", { name: "加入游戏" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入 4 位房间码")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the hall test and verify it fails**

Run: `npx vitest run src/components/game-shell/GameHallScreen.test.tsx`

Expected: FAIL with unresolved `GameHallScreen`.

- [ ] **Step 3: Create the modal and hall shell components**

```tsx
// src/components/game-shell/GameEntryModal.tsx
type GameEntryModalProps = {
  title: "创建游戏" | "加入游戏";
  open: boolean;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function GameEntryModal({
  title,
  open,
  roomCode,
  onRoomCodeChange,
  onClose,
  onConfirm,
}: GameEntryModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="gameModalBackdrop">
      <section aria-label={title} className="gameModalPanel" role="dialog">
        <header className="gameModalHeader">
          <h2>{title}</h2>
          <button onClick={onClose} type="button">
            关闭
          </button>
        </header>
        {title === "加入游戏" ? (
          <input
            value={roomCode}
            onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
            placeholder="输入 4 位房间码"
          />
        ) : null}
        <button className="primaryButton" onClick={onConfirm} type="button">
          {title === "创建游戏" ? "立即建房" : "进入房间"}
        </button>
      </section>
    </div>
  );
}
```

```tsx
// src/components/game-shell/GameHallScreen.tsx
"use client";

import { useState } from "react";

import { GameEntryModal } from "@/components/game-shell/GameEntryModal";

type Props = {
  nickname: string;
  roomCode?: string;
  onNicknameChange: (value: string) => void;
  onRoomCodeChange?: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
};

export function GameHallScreen({
  nickname,
  roomCode = "",
  onNicknameChange,
  onRoomCodeChange = () => undefined,
  onCreate,
  onJoin,
}: Props) {
  const [modal, setModal] = useState<null | "create" | "join">(null);

  return (
    <section className="gameHallShell">
      <div className="gameHallHero">
        <p className="gameHallTag">开房、拉人、列阵、开打</p>
        <h1>小小数学战场</h1>
        <input
          value={nickname}
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder="输入一个短昵称"
        />
      </div>

      <div className="gameHallActions">
        <button className="primaryButton" onClick={() => setModal("create")} type="button">
          创建游戏
        </button>
        <button className="secondaryButton" onClick={() => setModal("join")} type="button">
          加入游戏
        </button>
      </div>

      <GameEntryModal
        open={modal === "create"}
        title="创建游戏"
        roomCode=""
        onRoomCodeChange={() => undefined}
        onClose={() => setModal(null)}
        onConfirm={onCreate}
      />

      <GameEntryModal
        open={modal === "join"}
        title="加入游戏"
        roomCode={roomCode}
        onRoomCodeChange={onRoomCodeChange}
        onClose={() => setModal(null)}
        onConfirm={onJoin}
      />

      {message ? <p className="gameHallMessage">{message}</p> : null}
    </section>
  );
}
```

- [ ] **Step 4: Wire the home page to the new shell and replace the old card layout**

```tsx
// src/app/page.tsx
import { GameHallScreen } from "@/components/game-shell/GameHallScreen";

// inside HomePage return
<main className={styles.page}>
  <GameHallScreen
    nickname={nickname}
    roomCode={roomCode}
    onNicknameChange={setNickname}
    onRoomCodeChange={setRoomCode}
    onCreate={async () => {
      const room = await createRoom({ capacity, nickname });
      router.push(`/room/${room.code}`);
    }}
    onJoin={async () => {
      await joinRoom({ roomCode: roomCode.trim(), nickname });
      router.push(`/room/${roomCode.trim()}`);
    }}
  />
</main>
```

```css
/* src/app/globals.css */
.gameHallShell {
  width: min(420px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 18px;
}

.gameHallHero {
  min-height: 360px;
  padding: 24px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 50% 16%, rgba(255, 243, 190, 0.95), rgba(255, 243, 190, 0) 28%),
    linear-gradient(180deg, #c5e2ff 0%, #d3edff 40%, #eacb97 40%, #996031 100%);
}

.gameHallActions {
  display: grid;
  gap: 12px;
}

.gameModalBackdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(10, 15, 24, 0.52);
}

.gameModalPanel {
  width: min(360px, calc(100vw - 24px));
  padding: 20px;
  border-radius: 24px;
  background: rgba(255, 249, 241, 0.96);
}

.gameHallMessage {
  color: #9f2f23;
  font-weight: 800;
}
```

- [ ] **Step 4.5: Add a HomePage regression test and register app/component tests in Vitest**

```tsx
// src/app/page.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const push = vi.fn();
const createRoom = vi.fn();
const joinRoom = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/supabase/game-store", () => ({
  createRoom,
  joinRoom,
  readPlayerSession: vi.fn(async () => null),
  toUserMessage: (error: Error) => error.message,
}));

import HomePage from "@/app/page";

describe("HomePage", () => {
  beforeEach(() => {
    push.mockReset();
    createRoom.mockReset();
    joinRoom.mockReset();
  });

  it("creates a room with the selected capacity and routes to the room page", async () => {
    createRoom.mockResolvedValue({ code: "ABCD" });
    const user = userEvent.setup();

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "创建游戏" }));
    await user.click(screen.getByRole("button", { name: "4 人房" }));
    await user.click(screen.getByRole("button", { name: "立即建房" }));

    await waitFor(() => {
      expect(createRoom).toHaveBeenCalledWith(expect.objectContaining({ capacity: 4 }));
      expect(push).toHaveBeenCalledWith("/room/ABCD");
    });
  });

  it("normalizes join room code before joining", async () => {
    const user = userEvent.setup();
    joinRoom.mockResolvedValue(undefined);

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "加入游戏" }));
    await user.type(screen.getByPlaceholderText("输入 4 位房间码"), " abcd ");
    await user.click(screen.getByRole("button", { name: "进入房间" }));

    await waitFor(() => {
      expect(joinRoom).toHaveBeenCalledWith(expect.objectContaining({ roomCode: "ABCD" }));
      expect(push).toHaveBeenCalledWith("/room/ABCD");
    });
  });

  it("keeps failure messaging visible on the hall shell", async () => {
    const user = userEvent.setup();
    createRoom.mockRejectedValue(new Error("创建失败"));

    render(<HomePage />);

    await user.click(screen.getByRole("button", { name: "创建游戏" }));
    await user.click(screen.getByRole("button", { name: "立即建房" }));

    expect(await screen.findByText("创建失败")).toBeInTheDocument();
  });
});
```

```ts
// vitest.config.ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/lib/server/**/*.test.ts",
      "src/lib/game/content/**/*.test.ts",
      "src/lib/game/protocol/**/*.test.ts",
      "src/components/game-shell/**/*.test.tsx",
      "src/app/**/*.test.tsx",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

- [ ] **Step 5: Run the hall test and lint the page rewrite**

Run: `npx vitest run src/components/game-shell/GameHallScreen.test.tsx && npx vitest run src/app/page.test.tsx && npm run lint`

Expected:
- hall screen test PASS
- home page regression test PASS
- `eslint` PASS

- [ ] **Step 6: Commit the hall rewrite**

```bash
git add src/components/game-shell/GameEntryModal.tsx src/components/game-shell/GameHallScreen.tsx src/app/page.tsx src/app/page.test.tsx src/app/page.module.css src/app/globals.css src/components/game-shell/GameHallScreen.test.tsx vitest.config.ts
git commit -m "feat: rebuild hall screen and entry modal"
```

## Task 5: Rebuild the Room Prep Screen

**Files:**
- Create: `src/components/game-shell/RoomPrepScreen.tsx`
- Modify: `src/app/room/[code]/page.tsx`
- Modify: `src/app/room/[code]/page.module.css`
- Test: `src/components/game-shell/RoomPrepScreen.test.tsx`

- [ ] **Step 1: Write the failing room prep test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RoomPrepScreen } from "@/components/game-shell/RoomPrepScreen";

describe("RoomPrepScreen", () => {
  it("shows both camps and the host battle CTA", () => {
    render(
      <RoomPrepScreen
        roomCode="ABCD"
        canStart
        isHost
        redMembers={[{ playerId: "1", nickname: "红一号", team: "red", joinedAt: "" }]}
        blueMembers={[{ playerId: "2", nickname: "蓝一号", team: "blue", joinedAt: "" }]}
        onJoinTeam={vi.fn()}
        onStart={vi.fn()}
      />,
    );

    expect(screen.getByText("红队营地")).toBeInTheDocument();
    expect(screen.getByText("蓝队营地")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "房主开始对战" })).toBeEnabled();
  });
});
```

- [ ] **Step 2: Run the room prep test and verify it fails**

Run: `npx vitest run src/components/game-shell/RoomPrepScreen.test.tsx`

Expected: FAIL with unresolved `RoomPrepScreen`.

- [ ] **Step 3: Create the new room prep shell**

```tsx
// src/components/game-shell/RoomPrepScreen.tsx
import type { DemoMember } from "@/lib/demo/store";
import type { TeamName } from "@/lib/game/types";

type Props = {
  roomCode: string;
  canStart: boolean;
  isHost: boolean;
  redMembers: DemoMember[];
  blueMembers: DemoMember[];
  onJoinTeam: (team: TeamName) => void;
  onStart: () => void;
};

export function RoomPrepScreen({
  roomCode,
  canStart,
  isHost,
  redMembers,
  blueMembers,
  onJoinTeam,
  onStart,
}: Props) {
  return (
    <section className="roomPrepShell">
      <header className="roomPrepHeader">
        <span>房间 {roomCode}</span>
        <button className="ghostButton" type="button">
          复制 / 邀请
        </button>
      </header>

      <div className="roomPrepBattlefield">
        <article className="roomCamp roomCampRed">
          <h2>红队营地</h2>
          <ul>{redMembers.map((member) => <li key={member.playerId}>{member.nickname}</li>)}</ul>
          <button className="ghostButton" onClick={() => onJoinTeam("red")} type="button">
            加入红队
          </button>
        </article>

        <article className="roomCamp roomCampBlue">
          <h2>蓝队营地</h2>
          <ul>{blueMembers.map((member) => <li key={member.playerId}>{member.nickname}</li>)}</ul>
          <button className="ghostButton" onClick={() => onJoinTeam("blue")} type="button">
            加入蓝队
          </button>
        </article>
      </div>

      {isHost ? (
        <button className="primaryButton" disabled={!canStart} onClick={onStart} type="button">
          房主开始对战
        </button>
      ) : (
        <p className="roomPrepHint">等待房主开始。你可以继续编队。</p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Wire the room page to the new prep screen**

```tsx
// src/app/room/[code]/page.tsx
import { RoomPrepScreen } from "@/components/game-shell/RoomPrepScreen";

// replace the main return shell
<main className={styles.page}>
  <RoomPrepScreen
    roomCode={room.code}
    canStart={snapshot.canStart}
    isHost={snapshot.viewer?.playerId === room.hostPlayerId}
    redMembers={redMembers}
    blueMembers={blueMembers}
    onJoinTeam={async (team) => {
      await switchTeam(roomCode, team);
      await loadSnapshot();
    }}
    onStart={async () => {
      const match = await startMatch(roomCode);
      router.push(`/battle/${match.id}`);
    }}
  />
</main>
```

```css
/* src/app/room/[code]/page.module.css */
.page {
  min-height: 100vh;
  padding: 14px 10px 28px;
}

.roomPrepShell {
  width: min(420px, 100%);
  margin: 0 auto;
  display: grid;
  gap: 14px;
}

.roomPrepBattlefield {
  display: grid;
  gap: 12px;
  padding: 14px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 50% 14%, rgba(255, 243, 190, 0.95), rgba(255, 243, 190, 0) 26%),
    linear-gradient(180deg, #c5e2ff 0%, #d3edff 40%, #eacb97 40%, #996031 100%);
}
```

- [ ] **Step 5: Run the room prep test and lint the room page**

Run: `npx vitest run src/components/game-shell/RoomPrepScreen.test.tsx && npm run lint`

Expected:
- room prep test PASS
- `eslint` PASS

- [ ] **Step 6: Commit the room prep rewrite**

```bash
git add src/components/game-shell/RoomPrepScreen.tsx src/app/room/[code]/page.tsx src/app/room/[code]/page.module.css src/components/game-shell/RoomPrepScreen.test.tsx
git commit -m "feat: rebuild room prep screen"
```

## Task 6: Add the Battle View Model and Phaser Battle Stage

**Files:**
- Create: `src/components/battle-runtime/build-battle-view-model.ts`
- Create: `src/components/battle-runtime/BattleHud.tsx`
- Create: `src/components/battle-runtime/PhaserBattleStage.tsx`
- Create: `src/components/battle-runtime/scenes/BattleScene.ts`
- Modify: `src/app/battle/[matchId]/page.tsx`
- Modify: `src/app/battle/[matchId]/page.module.css`
- Test: `src/components/battle-runtime/build-battle-view-model.test.ts`

- [ ] **Step 1: Write the failing battle view-model test**

```ts
import { describe, expect, it } from "vitest";

import { buildBattleViewModel } from "@/components/battle-runtime/build-battle-view-model";
import { createEmptyMatchState } from "@/lib/game/protocol/state";

describe("buildBattleViewModel", () => {
  it("surfaces the top bar, battle banner, and bottom question card", () => {
    const state = {
      ...createEmptyMatchState(),
      phase: "active",
      currentQuestion: {
        id: "q-1",
        prompt: "27 + 16 = ?",
        inputSchema: "single-number",
        damage: 10,
        deadlineAt: "2026-04-16T10:00:08.000Z",
      },
      teams: {
        red: { hpCurrent: 100, hpMax: 100 },
        blue: { hpCurrent: 90, hpMax: 100 },
      },
    };

    const viewModel = buildBattleViewModel(state, Date.parse("2026-04-16T10:00:04.000Z"));

    expect(viewModel.topBarLabel).toBe("红 100 / 蓝 90");
    expect(viewModel.questionCard.prompt).toBe("27 + 16 = ?");
    expect(viewModel.bottomPanelMode).toBe("answer");
  });
});
```

- [ ] **Step 2: Run the battle view-model test and verify it fails**

Run: `npx vitest run src/components/battle-runtime/build-battle-view-model.test.ts`

Expected: FAIL with unresolved `build-battle-view-model`.

- [ ] **Step 3: Implement the battle view model and DOM HUD**

```ts
// src/components/battle-runtime/build-battle-view-model.ts
import type { MatchState } from "@/lib/game/protocol/state";

export function buildBattleViewModel(state: MatchState, now: number) {
  return {
    topBarLabel: `红 ${state.teams.red.hpCurrent} / 蓝 ${state.teams.blue.hpCurrent}`,
    bottomPanelMode: state.phase === "finished" ? "result" : "answer",
    questionCard: state.currentQuestion
      ? {
          prompt: state.currentQuestion.prompt,
          damage: state.currentQuestion.damage,
          secondsLeft: Math.max(
            0,
            Math.ceil((Date.parse(state.currentQuestion.deadlineAt) - now) / 1000),
          ),
        }
      : null,
  } as const;
}
```

```tsx
// src/components/battle-runtime/BattleHud.tsx
type BattleHudProps = {
  prompt: string;
  damage: number;
  secondsLeft: number;
  children: React.ReactNode;
};

export function BattleHud({
  prompt,
  damage,
  secondsLeft,
  children,
}: BattleHudProps) {
  return (
    <section className="battleHud">
      <header className="battleHudHeader">
        <span>当前弹药题</span>
        <span>伤害 {damage}</span>
        <span>{secondsLeft} 秒</span>
      </header>
      <div className="battleHudQuestion">{prompt}</div>
      {children}
    </section>
  );
}
```

- [ ] **Step 4: Mount Phaser in a client component and wire the battle page to the new shell**

```tsx
// src/components/battle-runtime/PhaserBattleStage.tsx
"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";

import { BattleScene } from "@/components/battle-runtime/scenes/BattleScene";
import type { MatchState } from "@/lib/game/protocol/state";

export function PhaserBattleStage({ state }: { state: MatchState }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 390,
      height: 420,
      parent: rootRef.current,
      transparent: true,
      scene: new BattleScene(state),
    });

    return () => {
      game.destroy(true);
    };
  }, [state]);

  return <div className="battleCanvasMount" ref={rootRef} />;
}
```

```tsx
// src/app/battle/[matchId]/page.tsx
import { BattleHud } from "@/components/battle-runtime/BattleHud";
import { PhaserBattleStage } from "@/components/battle-runtime/PhaserBattleStage";
import { buildBattleViewModel } from "@/components/battle-runtime/build-battle-view-model";
import { matchStateFromSnapshot } from "@/lib/game/protocol/from-supabase-snapshot";

const state = matchStateFromSnapshot(snapshot);
const viewModel = buildBattleViewModel(state, now);

return (
  <main className={styles.page}>
    <section className={styles.shell}>
      <header className={styles.topBar}>{viewModel.topBarLabel}</header>
      <PhaserBattleStage state={state} />
      {viewModel.questionCard ? (
        <BattleHud
          damage={viewModel.questionCard.damage}
          prompt={viewModel.questionCard.prompt}
          secondsLeft={viewModel.questionCard.secondsLeft}
        >
          <QuestionForm question={match.currentQuestion} onSubmit={handleSubmit} />
        </BattleHud>
      ) : null}
    </section>
  </main>
);
```

- [ ] **Step 5: Run the battle view-model test, lint, and the legacy battle page build**

Run: `npx vitest run src/components/battle-runtime/build-battle-view-model.test.ts && npm run lint && npm run build`

Expected:
- view-model test PASS
- `eslint` PASS
- Next build PASS

- [ ] **Step 6: Commit the battle runtime shell**

```bash
git add src/components/battle-runtime/build-battle-view-model.ts src/components/battle-runtime/BattleHud.tsx src/components/battle-runtime/PhaserBattleStage.tsx src/components/battle-runtime/scenes/BattleScene.ts src/app/battle/[matchId]/page.tsx src/app/battle/[matchId]/page.module.css src/components/battle-runtime/build-battle-view-model.test.ts
git commit -m "feat: add phaser battle stage shell"
```

## Task 7: Scaffold the Coordinator Worker and Signed Ticket Flow

**Files:**
- Modify: `package.json`
- Create: `src/lib/server/coordinator-ticket.ts`
- Create: `src/lib/server/coordinator-ticket.test.ts`
- Create: `src/app/api/coordinator-ticket/route.ts`
- Create: `realtime-worker/wrangler.jsonc`
- Create: `realtime-worker/vitest.config.ts`
- Create: `realtime-worker/.dev.vars.example`
- Create: `realtime-worker/src/index.ts`
- Create: `realtime-worker/src/durable-objects/MatchRoom.ts`

- [ ] **Step 1: Write the failing ticket test**

```ts
import { describe, expect, it } from "vitest";

import { signCoordinatorTicket, verifyCoordinatorTicket } from "@/lib/server/coordinator-ticket";

describe("coordinator ticket", () => {
  it("round-trips a signed room ticket", async () => {
    const token = await signCoordinatorTicket(
      {
        playerId: "player-1",
        nickname: "阿杰",
        roomCode: "ABCD",
      },
      "super-secret-value",
    );

    const payload = await verifyCoordinatorTicket(token, "super-secret-value");

    expect(payload.playerId).toBe("player-1");
    expect(payload.roomCode).toBe("ABCD");
  });
});
```

- [ ] **Step 2: Run the ticket test and verify it fails**

Run: `npx vitest run src/lib/server/coordinator-ticket.test.ts`

Expected: FAIL with unresolved `coordinator-ticket`.

- [ ] **Step 3: Implement signed ticket helpers and the API route**

```ts
// src/lib/server/coordinator-ticket.ts
import { createHmac, timingSafeEqual } from "node:crypto";

type TicketPayload = {
  playerId: string;
  nickname: string;
  roomCode: string;
};

function encode(payload: TicketPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export async function signCoordinatorTicket(
  payload: TicketPayload,
  secret: string,
) {
  const body = encode(payload);
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export async function verifyCoordinatorTicket(token: string, secret: string) {
  const [body, signature] = token.split(".");
  const expected = createHmac("sha256", secret).update(body).digest("base64url");

  if (!signature || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("Invalid coordinator ticket");
  }

  return JSON.parse(Buffer.from(body, "base64url").toString()) as TicketPayload;
}
```

```ts
// src/app/api/coordinator-ticket/route.ts
import { NextResponse } from "next/server";

import { readCoordinatorEnv } from "@/lib/server/coordinator-env";
import { signCoordinatorTicket } from "@/lib/server/coordinator-ticket";

export async function POST(request: Request) {
  const { playerId, nickname, roomCode } = (await request.json()) as {
    playerId: string;
    nickname: string;
    roomCode: string;
  };

  const env = readCoordinatorEnv();
  const token = await signCoordinatorTicket({ playerId, nickname, roomCode }, env.sharedSecret);

  return NextResponse.json({
    url: `${env.baseUrl}/room/${roomCode}/connect`,
    token,
  });
}
```

- [ ] **Step 4: Scaffold the worker config and the Durable Object entrypoint**

```jsonc
// realtime-worker/wrangler.jsonc
{
  "name": "little-net-game-coordinator",
  "main": "src/index.ts",
  "compatibility_date": "2025-01-15",
  "durable_objects": {
    "bindings": [{ "name": "MATCH_ROOM", "class_name": "MatchRoom" }]
  },
  "migrations": [{ "tag": "v1", "new_sqlite_classes": ["MatchRoom"] }]
}
```

```ts
// realtime-worker/src/index.ts
import { MatchRoom } from "./durable-objects/MatchRoom";

export { MatchRoom };

export interface Env {
  MATCH_ROOM: DurableObjectNamespace<MatchRoom>;
  COORDINATOR_SHARED_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    const roomCode = url.pathname.split("/")[2];
    const stub = env.MATCH_ROOM.getByName(`room:${roomCode}`);
    return stub.fetch(request);
  },
};
```

```ts
// realtime-worker/src/durable-objects/MatchRoom.ts
import { DurableObject } from "cloudflare:workers";

export class MatchRoom extends DurableObject {
  sessions = new Map<WebSocket, { playerId: string; roomCode: string }>();

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.sessions.set(server, { playerId: "pending", roomCode: "pending" });
    server.send(JSON.stringify({ type: "room.connected" }));

    return new Response(null, { status: 101, webSocket: client });
  }
}
```

```json
// package.json
{
  "scripts": {
    "test:worker": "vitest run --config realtime-worker/vitest.config.ts",
    "test:all": "npm run test:legacy && npm run test:unit && npm run test:worker",
    "dev:worker": "wrangler dev --config realtime-worker/wrangler.jsonc",
    "typegen:worker": "wrangler types --config realtime-worker/wrangler.jsonc"
  }
}
```

- [ ] **Step 5: Add the worker test config and example vars**

```ts
// realtime-worker/vitest.config.ts
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    include: ["test/**/*.test.ts"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./realtime-worker/wrangler.jsonc" },
      },
    },
  },
});
```

```dotenv
# realtime-worker/.dev.vars.example
COORDINATOR_SHARED_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

- [ ] **Step 6: Run the ticket test and worker type generation**

Run: `npx vitest run src/lib/server/coordinator-ticket.test.ts && npm run typegen:worker`

Expected:
- ticket test PASS
- Wrangler types generated without config errors

- [ ] **Step 7: Commit the coordinator scaffold**

```bash
git add package.json src/lib/server/coordinator-ticket.ts src/lib/server/coordinator-ticket.test.ts src/app/api/coordinator-ticket/route.ts realtime-worker/wrangler.jsonc realtime-worker/vitest.config.ts realtime-worker/.dev.vars.example realtime-worker/src/index.ts realtime-worker/src/durable-objects/MatchRoom.ts
git commit -m "feat: scaffold coordinator worker and signed ticket flow"
```

## Task 8: Implement Room Session Coordination and Migrate the Room Page

**Files:**
- Create: `realtime-worker/src/lib/room-engine.ts`
- Create: `realtime-worker/test/room-engine.test.ts`
- Create: `src/lib/game/client/coordinator-client.ts`
- Create: `src/lib/game/client/use-room-session.ts`
- Modify: `realtime-worker/src/durable-objects/MatchRoom.ts`
- Modify: `src/app/room/[code]/page.tsx`

- [ ] **Step 1: Write the failing room-engine test**

```ts
import { describe, expect, it } from "vitest";

import { applyRoomAction, createRoomEngineState } from "../src/lib/room-engine";

describe("room engine", () => {
  it("applies team switches and computes canStart", () => {
    const initial = createRoomEngineState({
      roomCode: "ABCD",
      capacity: 2,
      hostPlayerId: "host-1",
      members: [
        { playerId: "host-1", nickname: "房主", team: "red" },
        { playerId: "guest-1", nickname: "队友", team: "red" },
      ],
    });

    const next = applyRoomAction(initial, {
      type: "switch_team",
      playerId: "guest-1",
      team: "blue",
    });

    expect(next.canStart).toBe(true);
    expect(next.members.find((member) => member.playerId === "guest-1")?.team).toBe("blue");
  });
});
```

- [ ] **Step 2: Run the room-engine test and verify it fails**

Run: `npx vitest run --config realtime-worker/vitest.config.ts realtime-worker/test/room-engine.test.ts`

Expected: FAIL with unresolved `room-engine`.

- [ ] **Step 3: Implement the pure room engine**

```ts
// realtime-worker/src/lib/room-engine.ts
import { canStartMatch, resolveTeamCounts } from "../../../src/lib/game/config";
import type { TeamName } from "../../../src/lib/game/types";

type Member = {
  playerId: string;
  nickname: string;
  team: TeamName;
};

type RoomEngineState = {
  roomCode: string;
  capacity: 2 | 3 | 4 | 6;
  hostPlayerId: string;
  members: Member[];
  canStart: boolean;
};

export function createRoomEngineState(input: Omit<RoomEngineState, "canStart">): RoomEngineState {
  return {
    ...input,
    canStart: canStartMatch({
      capacity: input.capacity,
      teams: resolveTeamCounts(input.members.map((member) => member.team)),
    }),
  };
}

export function applyRoomAction(
  state: RoomEngineState,
  action: { type: "switch_team"; playerId: string; team: TeamName },
) {
  const members = state.members.map((member) =>
    member.playerId === action.playerId ? { ...member, team: action.team } : member,
  );

  return createRoomEngineState({ ...state, members });
}
```

- [ ] **Step 4: Create the Next-side coordinator client and room hook**

```ts
// src/lib/game/client/coordinator-client.ts
export async function openCoordinatorSocket(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
}) {
  const response = await fetch("/api/coordinator-ticket", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as { url: string; token: string };
  return new WebSocket(`${data.url}?token=${data.token}`);
}
```

```ts
// src/lib/game/client/use-room-session.ts
"use client";

import { useEffect, useState } from "react";

import { openCoordinatorSocket } from "@/lib/game/client/coordinator-client";

export function useRoomSession(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
}) {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let socket: WebSocket | null = null;

    void openCoordinatorSocket(input).then((nextSocket) => {
      socket = nextSocket;
      nextSocket.addEventListener("open", () => setConnected(true));
      nextSocket.addEventListener("close", () => {
        if (!cancelled) {
          setConnected(false);
        }
      });
    });

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [input.nickname, input.playerId, input.roomCode]);

  return { connected };
}
```

- [ ] **Step 5: Wire the room page to the coordinator-backed session**

```tsx
// src/app/room/[code]/page.tsx
import { useRoomSession } from "@/lib/game/client/use-room-session";

const roomSession = useRoomSession({
  roomCode,
  playerId: snapshot.session?.playerId ?? "",
  nickname,
});

return (
  <main className={styles.page}>
    {!roomSession.connected ? <p className={styles.subtle}>正在连接战前编队频道…</p> : null}
    <RoomPrepScreen
      roomCode={room.code}
      canStart={snapshot.canStart}
      isHost={snapshot.viewer?.playerId === room.hostPlayerId}
      redMembers={redMembers}
      blueMembers={blueMembers}
      onJoinTeam={async (team) => {
        await switchTeam(roomCode, team);
      }}
      onStart={async () => {
        const match = await startMatch(roomCode);
        router.push(`/battle/${match.id}`);
      }}
    />
  </main>
);
```

- [ ] **Step 6: Run the room-engine test and lint**

Run: `npx vitest run --config realtime-worker/vitest.config.ts realtime-worker/test/room-engine.test.ts && npm run lint`

Expected:
- room engine test PASS
- `eslint` PASS

- [ ] **Step 7: Commit the room coordinator slice**

```bash
git add realtime-worker/src/lib/room-engine.ts realtime-worker/test/room-engine.test.ts src/lib/game/client/coordinator-client.ts src/lib/game/client/use-room-session.ts realtime-worker/src/durable-objects/MatchRoom.ts src/app/room/[code]/page.tsx
git commit -m "feat: add room session coordination"
```

## Task 9: Move Match Authority into the Coordinator and Remove Frontend Tick

**Files:**
- Create: `realtime-worker/src/lib/match-engine.ts`
- Create: `realtime-worker/test/match-engine.test.ts`
- Create: `src/lib/game/client/use-match-session.ts`
- Modify: `realtime-worker/src/durable-objects/MatchRoom.ts`
- Modify: `src/app/battle/[matchId]/page.tsx`
- Modify: `src/lib/supabase/game-store.ts`

- [ ] **Step 1: Write the failing match-engine test**

```ts
import { describe, expect, it } from "vitest";

import { createMatchEngine, submitAnswer } from "../src/lib/match-engine";

describe("match engine", () => {
  it("locks the first correct answer and emits the hp update", () => {
    const engine = createMatchEngine({
      mode: "1v1",
      roomCode: "ABCD",
      players: [
        { playerId: "red-1", team: "red" },
        { playerId: "blue-1", team: "blue" },
      ],
    });

    const result = submitAnswer(engine, {
      playerId: "red-1",
      answer: { value: "42" },
      evaluatorId: "math-single-number",
      correctAnswer: { value: 42 },
      damage: 10,
    });

    expect(result.events[0].type).toBe("match.answer_resolved");
    expect(result.state.teams.blue.hpCurrent).toBe(90);
  });
});
```

- [ ] **Step 2: Run the match-engine test and verify it fails**

Run: `npx vitest run --config realtime-worker/vitest.config.ts realtime-worker/test/match-engine.test.ts`

Expected: FAIL with unresolved `match-engine`.

- [ ] **Step 3: Implement the pure match engine with evaluator and timeout support**

```ts
// realtime-worker/src/lib/match-engine.ts
import { createInitialTeams } from "../../../src/lib/game/match";
import { evaluateAnswer } from "../../../src/lib/game/evaluators";
import type { MatchMode, TeamName } from "../../../src/lib/game/types";

export function createMatchEngine(input: {
  mode: MatchMode;
  roomCode: string;
  players: Array<{ playerId: string; team: TeamName }>;
}) {
  return {
    mode: input.mode,
    roomCode: input.roomCode,
    players: input.players,
    teams: createInitialTeams(input.mode),
    questionLocked: false,
    seq: 0,
  };
}

export function submitAnswer(
  state: ReturnType<typeof createMatchEngine>,
  input: {
    playerId: string;
    answer: Record<string, string | number | undefined>;
    evaluatorId: string;
    correctAnswer: Record<string, unknown>;
    damage: number;
  },
) {
  if (state.questionLocked) {
    return { state, events: [] };
  }

  const player = state.players.find((entry) => entry.playerId === input.playerId);

  if (!player) {
    throw new Error("Unknown player");
  }

  const correct = evaluateAnswer(input.evaluatorId, input.answer, input.correctAnswer);

  if (!correct) {
    return { state, events: [] };
  }

  state.questionLocked = true;
  const targetTeam: TeamName = player.team === "red" ? "blue" : "red";
  state.teams[targetTeam].hpCurrent = Math.max(
    0,
    state.teams[targetTeam].hpCurrent - input.damage,
  );
  state.seq += 1;

  return {
    state,
    events: [
      {
        seq: state.seq,
        type: "match.answer_resolved",
        serverTime: Date.now(),
        payload: {
          attackerTeam: player.team,
          targetTeam,
          damage: input.damage,
          hp: {
            red: state.teams.red.hpCurrent,
            blue: state.teams.blue.hpCurrent,
          },
        },
      },
    ],
  };
}
```

- [ ] **Step 4: Extend the Durable Object and client hook to use match events instead of `tickMatch`**

```ts
// src/lib/game/client/use-match-session.ts
"use client";

import { useEffect, useState } from "react";

import { reduceMatchEvent } from "@/lib/game/protocol/reducer";
import { createEmptyMatchState } from "@/lib/game/protocol/state";
import { openCoordinatorSocket } from "@/lib/game/client/coordinator-client";

export function useMatchSession(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
}) {
  const [state, setState] = useState(createEmptyMatchState());

  useEffect(() => {
    let socket: WebSocket | null = null;

    void openCoordinatorSocket(input).then((nextSocket) => {
      socket = nextSocket;
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(event.data) as { event: unknown };
        setState((current) => reduceMatchEvent(current, data.event as never));
      });
    });

    return () => {
      socket?.close();
    };
  }, [input]);

  return state;
}
```

```tsx
// src/app/battle/[matchId]/page.tsx
const handleSubmit = async (payload: Record<string, string>) => {
  await submitAnswer(matchId, payload);
};

const matchState = useMatchSession({
  roomCode: snapshot.room.code,
  playerId: snapshot.session?.playerId ?? "",
  nickname: snapshot.session?.nickname ?? "",
});

const state = matchState.lastSeq > 0 ? matchState : matchStateFromSnapshot(snapshot);

// delete this block entirely
// useEffect(() => {
//   const timer = window.setInterval(() => {
//     setNow(Date.now());
//     tickMatch(matchId).catch(() => undefined);
//   }, 500);
//   return () => window.clearInterval(timer);
// }, [matchId]);
```

- [ ] **Step 5: Run the match-engine test, lint, and build**

Run: `npx vitest run --config realtime-worker/vitest.config.ts realtime-worker/test/match-engine.test.ts && npm run lint && npm run build`

Expected:
- match engine test PASS
- `eslint` PASS
- Next build PASS

- [ ] **Step 6: Commit the match coordinator migration**

```bash
git add realtime-worker/src/lib/match-engine.ts realtime-worker/test/match-engine.test.ts src/lib/game/client/use-match-session.ts realtime-worker/src/durable-objects/MatchRoom.ts src/app/battle/[matchId]/page.tsx src/lib/supabase/game-store.ts
git commit -m "feat: move match authority to coordinator"
```

## Task 10: Persist Match Reports and Rebuild the Result Page

**Files:**
- Create: `supabase/migrations/202604160002_add_match_reports.sql`
- Create: `realtime-worker/src/lib/supabase-admin.ts`
- Create: `realtime-worker/src/lib/persistence.ts`
- Create: `src/lib/game/result/match-report.ts`
- Test: `src/lib/game/result/match-report.test.ts`
- Modify: `src/lib/supabase/game-store.ts`
- Modify: `src/app/result/[matchId]/page.tsx`

- [ ] **Step 1: Write the failing match-report test**

```ts
import { describe, expect, it } from "vitest";

import { buildMatchReport } from "@/lib/game/result/match-report";

describe("buildMatchReport", () => {
  it("maps the finished state into a result-page friendly report", () => {
    const report = buildMatchReport({
      winner: "red",
      winReason: "hp_zero",
      teams: {
        red: { hpCurrent: 32 },
        blue: { hpCurrent: 0 },
      },
      totalCorrect: { red: 6, blue: 4 },
      durationMs: 62_000,
    });

    expect(report.headline).toBe("红队胜利");
    expect(report.summary).toContain("血量归零");
    expect(report.stats.redCorrect).toBe(6);
  });
});
```

- [ ] **Step 2: Run the report test and verify it fails**

Run: `npx vitest run src/lib/game/result/match-report.test.ts`

Expected: FAIL with unresolved `match-report`.

- [ ] **Step 3: Add the report persistence migration**

```sql
-- supabase/migrations/202604160002_add_match_reports.sql
create table if not exists public.match_reports (
  match_id uuid primary key references public.matches (id) on delete cascade,
  room_code text not null,
  winner_team public.team_name not null,
  win_reason text not null,
  duration_ms integer not null,
  total_correct jsonb not null,
  final_hp jsonb not null,
  final_event_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.match_reports enable row level security;

create policy "match_reports_visible_to_room_members"
on public.match_reports
for select
to authenticated
using (
  exists (
    select 1
    from public.matches
    join public.room_members on room_members.room_id = matches.room_id
    where matches.id = match_reports.match_id
      and room_members.player_id = (select auth.uid())
  )
);
```

- [ ] **Step 4: Implement the worker persistence adapter and report mapper**

```ts
// realtime-worker/src/lib/supabase-admin.ts
export async function insertMatchReport(input: {
  matchId: string;
  roomCode: string;
  winnerTeam: "red" | "blue";
  winReason: "hp_zero" | "time_up";
  durationMs: number;
  totalCorrect: Record<"red" | "blue", number>;
  finalHp: Record<"red" | "blue", number>;
  finalEventLog: unknown[];
}) {
  const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/match_reports`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      match_id: input.matchId,
      room_code: input.roomCode,
      winner_team: input.winnerTeam,
      win_reason: input.winReason,
      duration_ms: input.durationMs,
      total_correct: input.totalCorrect,
      final_hp: input.finalHp,
      final_event_log: input.finalEventLog,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist match report: ${response.status}`);
  }
}
```

```ts
// src/lib/game/result/match-report.ts
export function buildMatchReport(input: {
  winner: "red" | "blue";
  winReason: "hp_zero" | "time_up";
  teams: {
    red: { hpCurrent: number };
    blue: { hpCurrent: number };
  };
  totalCorrect: { red: number; blue: number };
  durationMs: number;
}) {
  return {
    headline: input.winner === "red" ? "红队胜利" : "蓝队胜利",
    summary:
      input.winReason === "hp_zero"
        ? "有一方血量归零，战斗提前结束。"
        : "时间结束后，系统按血量结算胜负。",
    stats: {
      redHp: input.teams.red.hpCurrent,
      blueHp: input.teams.blue.hpCurrent,
      redCorrect: input.totalCorrect.red,
      blueCorrect: input.totalCorrect.blue,
      durationMs: input.durationMs,
    },
  };
}
```

- [ ] **Step 5: Update the result page and Supabase store to read the report**

```ts
// src/lib/supabase/game-store.ts
export async function getMatchReport(matchId: string) {
  const client = requireClient();
  const { data, error } = await client
    .from("match_reports")
    .select("*")
    .eq("match_id", matchId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
```

```tsx
// src/app/result/[matchId]/page.tsx
import { getMatchReport } from "@/lib/supabase/game-store";
import { buildMatchReport } from "@/lib/game/result/match-report";

const reportRow = await getMatchReport(matchId);
const report = buildMatchReport({
  winner: reportRow.winner_team,
  winReason: reportRow.win_reason,
  teams: {
    red: { hpCurrent: reportRow.final_hp.red },
    blue: { hpCurrent: reportRow.final_hp.blue },
  },
  totalCorrect: reportRow.total_correct,
  durationMs: reportRow.duration_ms,
});
```

- [ ] **Step 6: Run the report test, the worker tests, and build**

Run: `npx vitest run src/lib/game/result/match-report.test.ts && npm run test:worker && npm run build`

Expected:
- match report test PASS
- worker tests PASS
- Next build PASS

- [ ] **Step 7: Commit the report/persistence slice**

```bash
git add supabase/migrations/202604160002_add_match_reports.sql realtime-worker/src/lib/supabase-admin.ts realtime-worker/src/lib/persistence.ts src/lib/game/result/match-report.ts src/lib/game/result/match-report.test.ts src/lib/supabase/game-store.ts src/app/result/[matchId]/page.tsx
git commit -m "feat: persist match reports and rebuild result page"
```

## Task 11: Add Reconnect Verification and Release Checklists

**Files:**
- Create: `src/lib/game/client/use-room-session.test.ts`
- Create: `src/lib/game/client/use-match-session.test.ts`
- Create: `docs/verification/game-core-release-checklist.md`
- Modify: `README.md`

- [ ] **Step 1: Write the failing reconnect tests for the room and match socket factories**

```ts
import { describe, expect, it, vi } from "vitest";

import { createRoomSocketFactory } from "@/lib/game/client/use-room-session";
import { createMatchSocketFactory } from "@/lib/game/client/use-match-session";

describe("room and match socket factories", () => {
  it("forwards room session input to the room socket opener", async () => {
    const openSocket = vi.fn(async () => ({ close: vi.fn() } as unknown as WebSocket));
    const factory = createRoomSocketFactory(openSocket);

    await factory({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });

    expect(openSocket).toHaveBeenCalledWith({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });
  });

  it("forwards match session input to the match socket opener", async () => {
    const openSocket = vi.fn(async () => ({ close: vi.fn() } as unknown as WebSocket));
    const factory = createMatchSocketFactory(openSocket);

    await factory({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });

    expect(openSocket).toHaveBeenCalledWith({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });
  });
});
```

- [ ] **Step 2: Run the socket-factory tests and verify the failing surface**

Run: `npx vitest run src/lib/game/client/use-room-session.test.ts src/lib/game/client/use-match-session.test.ts`

Expected: FAIL until the socket factory helpers are exported.

- [ ] **Step 3: Make the hooks testable and document the release checklist**

```ts
// src/lib/game/client/use-room-session.ts
export function createRoomSocketFactory(
  openSocket: typeof openCoordinatorSocket,
) {
  return async (input: { roomCode: string; playerId: string; nickname: string }) =>
    openSocket(input);
}
```

```ts
// src/lib/game/client/use-match-session.ts
export function createMatchSocketFactory(
  openSocket: typeof openCoordinatorSocket,
) {
  return async (input: { roomCode: string; playerId: string; nickname: string }) =>
    openSocket(input);
}
```

```md
<!-- docs/verification/game-core-release-checklist.md -->
# Game Core Release Checklist

- [ ] `npm run test:legacy`
- [ ] `npm run test:unit`
- [ ] `npm run test:worker`
- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] 双设备竖屏联机验证：大厅 -> 房间 -> 对战 -> 结算 -> 再来一局
- [ ] 弱网断线重连验证：房间页、战斗页各 1 次
- [ ] Cloudflare coordinator logs 无未处理异常
- [ ] Supabase `match_reports` 正常写入
```

- [ ] **Step 4: Update the README with local startup order**

```md
## Local development

1. 启动 Next.js：`npm run dev`
2. 启动 Cloudflare coordinator：`npm run dev:worker`
3. 在浏览器打开大厅，完成创建房间、加入房间、开始对战验证

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `COORDINATOR_BASE_URL`
- `COORDINATOR_SHARED_SECRET`
```

- [ ] **Step 5: Run the complete verification suite**

Run: `npm run test:all && npm run lint && npm run build`

Expected:
- all legacy/unit/worker tests PASS
- lint PASS
- build PASS

- [ ] **Step 6: Commit the verification layer**

```bash
git add src/lib/game/client/use-room-session.test.ts src/lib/game/client/use-match-session.test.ts docs/verification/game-core-release-checklist.md README.md
git commit -m "test: add reconnect coverage and release checklist"
```
