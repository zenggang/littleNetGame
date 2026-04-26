# Game Setting Driven Game Feel Implementation Plan

> **Status update:** 本计划已暂停作为执行入口。当前执行入口改为 `docs/superpowers/plans/2026-04-25-setting-board-resource-adaptation-orchestration.md`，并跟随 `docs/superpowers/specs/2026-04-25-setting-board-resource-contract.md`。最新背景资源是 `home_bg.png`、`team_bg.png`、`battle_bg.png`、`score_bg.png` 四张完整 16:9 图，不再按 `backgroup.png` 五切片推进。

> **For agentic workers:** This is a historical plan. Do not execute it task by task for current work. Use `docs/superpowers/plans/2026-04-25-setting-board-resource-adaptation-orchestration.md` instead.

**Goal:** Use the approved 2026-04-25 setting board to turn the current playable realtime prototype into a more immediately game-like vertical battle experience across hall, room prep, battle HUD, Phaser stage, and result report.

**Architecture:** Keep the existing Next.js app shell and Phaser battle runtime. Treat React/DOM as the text-heavy UI and control layer, and Phaser as the battlefield layer. Any new game-feel state should be derived from existing room, match, viewer, event, and report data unless a later spec explicitly approves persistence or protocol changes.

**Tech Stack:** Next.js 16, React 19, TypeScript, Phaser, CSS Modules/global game styles, Vitest, React Testing Library, local demo mode, existing Cloudflare coordinator protocol

---

## Source Documents

- Historical spec: `docs/superpowers/specs/2026-04-25-game-setting-driven-gamefeel-design.md`
- Current spec: `docs/superpowers/specs/2026-04-25-setting-board-resource-contract.md`
- Setting board: `public/concepts/game-setting-board-2026-04-25.png`
- Setting board notes: `docs/superpowers/assets/2026-04-25-little-net-game-setting-board.md`
- Current state: `docs/superpowers/specs/2026-04-20-game-core-current-state-and-next-milestones.md`
- Release checklist: `docs/verification/game-core-release-checklist.md`

## Target Repository Shape

### Existing files to modify

- `src/components/game-shell/GameHallScreen.tsx`
- `src/components/game-shell/GameEntryModal.tsx`
- `src/components/game-shell/RoomPrepScreen.tsx`
- `src/app/page.tsx`
- `src/app/room/[code]/page.tsx`
- `src/app/battle/[matchId]/page.tsx`
- `src/app/battle/[matchId]/page.module.css`
- `src/components/battle-runtime/BattleHud.tsx`
- `src/components/battle-runtime/build-battle-view-model.ts`
- `src/components/battle-runtime/scenes/BattleScene.ts`
- `src/app/result/[matchId]/page.tsx`
- `src/app/result/[matchId]/page.module.css`
- `src/app/globals.css`

### Existing tests to extend

- `src/components/game-shell/GameHallScreen.test.tsx`
- `src/components/game-shell/RoomPrepScreen.test.tsx`
- `src/components/battle-runtime/build-battle-view-model.test.ts`
- `src/app/battle/[matchId]/page.test.tsx`
- `src/lib/game/result/match-report.test.ts`
- `src/app/result/[matchId]/page.test.tsx`

### New or updated docs/assets

- `public/concepts/game-setting-board-2026-04-25.png`
- `public/backgroup.png`
- `public/background-assets/`
- `public/imageSheet1.png`
- `public/sheet-assets/`
- `docs/superpowers/assets/2026-04-25-little-net-game-setting-board.md`
- `docs/superpowers/specs/2026-04-25-game-setting-driven-gamefeel-design.md`
- `docs/superpowers/plans/2026-04-25-game-setting-driven-gamefeel-implementation.md`
- `docs/superpowers/specs/2026-04-20-game-core-current-state-and-next-milestones.md`
- `docs/verification/game-core-release-checklist.md`

## Phase 0: Lock Reference And Baseline

**Files:**
- Verify: `public/concepts/game-setting-board-2026-04-25.png`
- Verify: `docs/superpowers/assets/2026-04-25-little-net-game-setting-board.md`
- Verify: `docs/superpowers/specs/2026-04-25-game-setting-driven-gamefeel-design.md`

- [ ] Step 1: Confirm the setting board exists in `public/concepts/`.
- [ ] Step 2: Read the active spec and setting-board notes before editing UI code.
- [ ] Step 3: Run current baseline checks before implementation if the local environment is healthy:
  - `npm run test:all`
  - `npm run lint`
  - `npm run build`
- [ ] Step 4: If baseline checks fail for unrelated environment reasons, record the exact blocker before implementation.

## Phase 1: Extract Game Visual System And Runtime Slices

**Files:**
- Modify: `src/app/globals.css`
- Add: `public/background-assets/hall-bg.png`
- Add: `public/background-assets/room-bg.png`
- Add: `public/background-assets/battle-bg.png`
- Add: `public/background-assets/control-bg.png`
- Add: `public/background-assets/result-bg.png`
- Add: `public/sheet-assets/`
- Possibly modify: `src/app/page.module.css`, `src/app/battle/[matchId]/page.module.css`, `src/app/result/[matchId]/page.module.css`

- [x] Step 1: Add a small set of game theme tokens for sand ground, sky, red team, blue team, gold reward, panel edge, danger, and success states.
- [x] Step 2: Extract `backgroup.png` into `public/background-assets/` and `imageSheet1.png` into `public/sheet-assets/` for runtime visual alignment.
- [x] Step 3: Keep existing class names where possible; avoid a broad CSS reset or full restyle unrelated to the target pages.
- [x] Step 4: Add reduced-motion fallbacks for non-essential UI motion.
- [ ] Step 5: Verify existing buttons and inputs still render correctly in hall, room, battle, and result pages.

Expected result:

- The project has one consistent visual language for the next phases.
- The page should not become a one-note single-hue theme.

## Phase 2: Rebuild Hall As Game Entry

**Files:**
- Modify: `src/components/game-shell/GameHallScreen.tsx`
- Modify: `src/components/game-shell/GameEntryModal.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/game-shell/GameHallScreen.test.tsx`

- [x] Step 1: Move the hall first impression from nickname input to red/blue battle cover.
- [ ] Step 2: Keep `创建游戏` and `加入游戏` as the two primary actions.
- [x] Step 3: Keep nickname editing available, but reduce its visual dominance.
- [ ] Step 4: Convert the create/join modal copy and layout into a compact start panel.
- [ ] Step 5: Preserve current create and join behavior exactly.
- [ ] Step 6: Update component tests for visible labels, modal behavior, and submitted callbacks.

Acceptance:

- The first viewport reads as a game hall, not a form page.
- Existing create/join flow still navigates correctly in local demo mode.

## Phase 3: Upgrade Room Prep To War Room

**Files:**
- Modify: `src/components/game-shell/RoomPrepScreen.tsx`
- Modify: `src/app/room/[code]/page.tsx`
- Modify: `src/app/globals.css`
- Test: `src/components/game-shell/RoomPrepScreen.test.tsx`

- [x] Step 1: Replace list-like camp presentation with slot/platform presentation.
- [x] Step 2: Make current player, empty slots, team balance, and start readiness visually obvious.
- [ ] Step 3: Keep copy/invite visible but secondary.
- [ ] Step 4: Make host start action read as `开战` rather than generic form submission.
- [ ] Step 5: Preserve all current `onJoinTeam`, `onStart`, `onCopyCode`, `busy`, and `error` behavior.
- [ ] Step 6: Update tests for red/blue members, empty states, disabled start, and host/non-host rendering.

Acceptance:

- A room screenshot clearly communicates battle prep.
- No room-session or coordinator behavior changes are required.

## Phase 4: Strengthen Battle Stage And Control Deck

**Files:**
- Modify: `src/app/battle/[matchId]/page.tsx`
- Modify: `src/app/battle/[matchId]/page.module.css`
- Modify: `src/components/battle-runtime/BattleHud.tsx`
- Modify: `src/components/battle-runtime/build-battle-view-model.ts`
- Modify: `src/components/battle-runtime/scenes/BattleScene.ts`
- Test: `src/components/battle-runtime/build-battle-view-model.test.ts`
- Test: `src/app/battle/[matchId]/page.test.tsx`

- [x] Step 1: Keep the existing top HUD, Phaser stage, and lower HUD structure, but make the stage visually dominant.
- [x] Step 2: Add stronger number-projectile, shield, impact, danger, and finish cues using lightweight Phaser graphics or existing assets.
- [x] Step 3: Reframe HUD labels around ammo, loading, fire, damage, and cooldown.
- [ ] Step 4: Make question transition read as ammunition loading.
- [x] Step 5: Preserve current answer submission behavior and cooldown logic.
- [ ] Step 6: Add view-model tests for new labels, tones, and cue conditions.

Acceptance:

- Correct answer, wrong answer, timeout, and finish each produce distinct visible feedback.
- The DOM control deck does not swallow the battle stage.

## Phase 5: Convert Result Page To Battle Report

**Files:**
- Modify: `src/app/result/[matchId]/page.tsx`
- Modify: `src/app/result/[matchId]/page.module.css`
- Modify: `src/lib/game/result/match-report.ts`
- Test: `src/lib/game/result/match-report.test.ts`
- Test: `src/app/result/[matchId]/page.test.tsx`

- [ ] Step 1: Keep current report data sources and fallback order.
- [ ] Step 2: Derive battle-report fields from existing data: winner, win reason, final HP, total correct, and event log.
- [ ] Step 3: Add MVP / key-hit style labels only when they can be derived from available event data.
- [ ] Step 4: Make `再来一局` the primary action and `返回大厅` secondary.
- [ ] Step 5: Update tests for report rendering and fallback behavior.

Acceptance:

- Result screenshot reads as a victory report, not a stats dashboard.
- Missing `match_reports` still falls back through cached report safely.

## Phase 6: Verification And Documentation Sync

**Files:**
- Modify if needed: `README.md`
- Modify: `docs/superpowers/specs/2026-04-20-game-core-current-state-and-next-milestones.md`
- Modify: `docs/verification/game-core-release-checklist.md`

- [ ] Step 1: Run automated checks:
  - `npm run test:all`
  - `npm run lint`
  - `npm run build`
- [ ] Step 2: Run local demo smoke:
  - Hall -> create room
  - second tab joins
  - room prep -> battle
  - answer correct / wrong / timeout if feasible
  - result -> replay
- [ ] Step 3: Capture mobile-width screenshots for hall, room, battle, and result.
- [ ] Step 4: Update current-state and checklist with verified status.
- [ ] Step 5: If production release is planned, keep existing coordinator release gates unchanged.

Acceptance:

- Code, tests, and docs agree on the same active milestone.
- If a check is not run, the final handoff explicitly says why.
