# Realtime Coordinator Event-First Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 realtime coordinator 从整包 snapshot 主通道调整为 event-first 主通道，并补齐前端事件消费与恢复闭环。

**Architecture:** 服务端先把 `match-engine` 已有事件接入 websocket 主链路，并拆开 room / match 广播；前端 `useMatchSession` 先切到基于 reducer 的事件消费，同时保留 snapshot 作为初始化与恢复通道；随后补齐最小 `seq/resync` 与 checkpoint 节流。整个改造保持现有玩法语义不变，以兼容过渡为主。

**Tech Stack:** TypeScript, Next.js, React hooks, Cloudflare Durable Objects, Vitest, tsx test runner

---

### Task 1: 同步 spec 并建立实现基线

**Files:**
- Create: `docs/superpowers/specs/2026-04-20-realtime-coordinator-event-first-optimization-design.md`
- Create: `docs/superpowers/plans/2026-04-20-realtime-coordinator-event-first-optimization.md`
- Verify: `git status --short`

- [ ] **Step 1: 确认 worktree 是干净基线**
Run: `git status --short`
Expected: 空输出

- [ ] **Step 2: 在 worktree 内同步本次 spec 与 plan**
Run: `test -f docs/superpowers/specs/2026-04-20-realtime-coordinator-event-first-optimization-design.md && test -f docs/superpowers/plans/2026-04-20-realtime-coordinator-event-first-optimization.md`
Expected: exit 0

### Task 2: 先用测试锁定 match 事件主通道

**Files:**
- Modify: `src/lib/game/protocol/coordinator.ts`
- Modify: `src/lib/game/client/use-match-session.ts`
- Modify: `src/lib/game/client/use-match-session.test.ts`
- Modify: `src/lib/game/protocol/from-supabase-snapshot.ts`
- Modify: `src/lib/game/protocol/reducer.ts`

- [ ] **Step 1: 先补 failing tests，覆盖 match.event、seq 推进、gap fallback**
Run: `npx vitest run src/lib/game/client/use-match-session.test.ts src/lib/game/protocol/reducer.test.ts`
Expected: 新增断言先失败，失败点落在 `match.event` 尚未处理或 `lastSeq` 尚未持久化

- [ ] **Step 2: 最小实现前端 match 事件消费**
Run: `npx vitest run src/lib/game/client/use-match-session.test.ts src/lib/game/protocol/reducer.test.ts`
Expected: 新增用例通过

### Task 3: 用测试驱动服务端 room/match 拆播与 snapshot-on-demand

**Files:**
- Modify: `realtime-worker/src/durable-objects/MatchRoom.ts`
- Modify: `src/lib/game/protocol/coordinator.ts`
- Create or Modify: `realtime-worker/test/match-room.test.ts`

- [ ] **Step 1: 先补 failing tests，覆盖首连 snapshot、常规 match.event、room 变化不再携带 match.snapshot**
Run: `npx vitest run realtime-worker/test/match-room.test.ts`
Expected: 新增用例失败，失败点落在当前仍调用 `broadcastSnapshots()`

- [ ] **Step 2: 最小实现服务端拆播与事件广播**
Run: `npx vitest run realtime-worker/test/match-room.test.ts realtime-worker/test/match-engine.test.ts`
Expected: 相关 worker tests 通过

### Task 4: 用测试驱动 sync.request 与 checkpoint 节流

**Files:**
- Modify: `realtime-worker/src/durable-objects/MatchRoom.ts`
- Modify: `src/lib/game/client/use-match-session.ts`
- Modify: `src/lib/game/client/use-match-session.test.ts`
- Modify: `src/lib/game/protocol/coordinator.ts`

- [ ] **Step 1: 先补 failing tests，覆盖 seq gap 后触发 sync.request 与 snapshot 恢复**
Run: `npx vitest run src/lib/game/client/use-match-session.test.ts realtime-worker/test/match-room.test.ts`
Expected: 新增恢复用例失败

- [ ] **Step 2: 最小实现 sync.request + checkpoint 节流**
Run: `npx vitest run src/lib/game/client/use-match-session.test.ts realtime-worker/test/match-room.test.ts realtime-worker/test/match-engine.test.ts`
Expected: 相关恢复与 worker tests 通过

### Task 5: 收口 battle 页依赖并做文档同步

**Files:**
- Modify: `src/app/battle/[matchId]/page.tsx`
- Modify: `docs/superpowers/specs/2026-04-20-game-core-current-state-and-next-milestones.md`
- Modify: `docs/verification/game-core-release-checklist.md`

- [ ] **Step 1: 先补或调整 battle 页测试，确认不再长期依赖 `tickMatch + loadSnapshot` 轮询**
Run: `npx vitest run src/app/battle/[matchId]/page.test.tsx`
Expected: 如果仍假设轮询存在，先失败

- [ ] **Step 2: 实现 battle 页依赖收口并同步文档**
Run: `npx vitest run src/app/battle/[matchId]/page.test.tsx`
Expected: battle tests 通过

### Task 6: 最终验证

**Files:**
- Verify only

- [ ] **Step 1: 跑协议与前端相关测试**
Run: `npx vitest run src/lib/game/client/use-match-session.test.ts src/lib/game/protocol/reducer.test.ts src/app/battle/[matchId]/page.test.tsx`
Expected: 全部通过

- [ ] **Step 2: 跑 worker 相关测试**
Run: `npm run test:worker`
Expected: exit 0

- [ ] **Step 3: 跑最小回归测试**
Run: `npm run test:legacy`
Expected: exit 0
