# littleNetGame 实时协调层 event-first 优化设计

- 日期：2026-04-20
- 状态：活跃规格，供后续工程实现与验证使用
- 所属阶段：核心主链路跑通后的实时性与稳定性收口
- 适用流程：先锁规范，再进入实现与验证

---

## Context

- Background:
  - 当前 `littleNetGame` 的核心联机闭环已经跑通，真实技术形态是 `Next.js + Phaser + Supabase + Cloudflare Durable Objects coordinator`。
  - 当前项目已经从“验证方向是否成立”进入“实时体验、恢复能力、验证门槛收口”阶段。
- Existing behavior:
  - `MatchRoom` 在新连接、`alarm()`、`room.join`、`room.switch_team`、`room.start_match`、`room.restart`、`match.submit_answer`、`match.tick` 等多个节点后，都会通过 `broadcastSnapshots()` 给所有连接广播整包 `room.snapshot` 和 `match.snapshot`。
  - `match-engine` 内部已经可以产出带 `seq` 和 `serverTime` 的 `match.question_opened`、`match.answer_resolved`、`match.question_timed_out`、`match.finished` 事件，但这些事件目前没有成为 websocket 主同步协议。
  - 前端 `useRoomSession` / `useMatchSession` 目前仍以接收整包 snapshot 并整体 `setState` 为主；battle / room 页面仍保留基于 snapshot 的轮询补偿和 `match.tick` 兜底。
  - `persistCheckpoint()` 当前以整包写入 DO storage 为主，调用点较多，容易在高频链路中形成额外写放大。
- Why this change is needed:
  - 当前主链路的核心问题不是底座选型错误，而是同步协议仍偏 `snapshot-first`，导致消息体偏大、无效广播偏多、前端整包重派生偏重、恢复机制依赖“反复发快照”而不是显式协议补偿。
  - 如果继续在现有 `snapshot-first` 基础上叠功能，后续的观战、战报、回放、弱网恢复、性能排查都会持续变重。

## Goal

- Primary outcome:
  - 在不改变现有房间规则、对局节奏和用户可见玩法语义的前提下，把 coordinator 主同步协议从 `snapshot-first` 演进为 `event-first, snapshot-on-demand`。
- User-visible result:
  - 玩家在房间编队、开局、开题、答题命中、掉血、结束等高频交互下，收到更及时、更稳定的反馈。
  - 弱网、断线、重连、丢消息场景下，客户端能够通过明确的 `seq/resync` 机制恢复状态，而不是依赖持续整包快照兜底。
  - battle 页和 room 页在高频更新时减少无关区域抖动、重绘和状态闪烁。

## Scope

- In scope:
  - coordinator websocket 协议从“快照主通道”调整为“事件主通道 + 快照补偿通道”。
  - 房间态广播与对局态广播拆分。
  - `match-engine` 已存在的事件真正接入 websocket 广播链路。
  - 房间态新增轻量事件模型，覆盖成员加入、换队、开局、重开等房间阶段变化。
  - 前端 session hooks 从“整包 snapshot 驱动”改为“事件 reducer 驱动 + snapshot 初始化/恢复”。
  - `persistCheckpoint()` 调整为“节流落盘 + 关键节点强制落盘”。
  - 建立最小可用的 `seq + gap detection + sync.request + snapshot resync` 闭环。
  - 在协议稳定后，移除 battle / room 页面当前的高频轮询补偿和客户端驱动 `match.tick`。
- Affected modules or surfaces:
  - `realtime-worker/src/durable-objects/MatchRoom.ts`
  - `realtime-worker/src/lib/match-engine.ts`
  - `src/lib/game/protocol/coordinator.ts`
  - `src/lib/game/protocol/events.ts`
  - `src/lib/game/protocol/reducer.ts`
  - `src/lib/game/protocol/state.ts`
  - `src/lib/game/protocol/from-supabase-snapshot.ts`
  - `src/lib/game/client/use-room-session.ts`
  - `src/lib/game/client/use-match-session.ts`
  - `src/app/room/[code]/page.tsx`
  - `src/app/battle/[matchId]/page.tsx`
  - 相关测试文件

## Non-goals

- Explicitly out of scope:
  - 不在本轮引入新的玩法规则、题目机制、结算字段或战斗表现改版。
  - 不在本轮把 `Lobby / Matchmaking / MatchRoom` 拆成新的多个 Durable Object。
  - 不在本轮引入完整的事件持久化日志、事件回放系统或复杂 ack/replay 窗口。
  - 不在本轮重构 Supabase 表结构和战报模型，只允许做最小必要的接口适配。
  - 不以“为了性能”名义改变当前房间页、战斗页、结果页的用户可见业务语义。

## Acceptance Criteria

1. 在 room.join、room.switch_team、match.submit_answer、question timeout、match finish 等常规高频路径下，不再默认向全房广播整包 `room.snapshot + match.snapshot`。
2. battle 页能够基于真实 websocket 事件持续更新当前题目、血量、终局状态；`reduceMatchEvent()` 等协议 reducer 不再是闲置代码。
3. room 页能够基于房间事件更新成员列表、队伍归属、开局状态，而不是仅靠整包房间快照反复覆盖。
4. snapshot 只在以下场景作为必要补偿使用：新连接、重连恢复、显式同步请求、序列号跳变恢复。
5. `persistCheckpoint()` 不再在每次高频动作后直接整包写入；存在节流策略，并保留开局、成员变更、重开、结束等关键节点强制落盘。
6. battle 页和 room 页现有轮询补偿在协议稳定后被移除或显著降级，不再承担长期主同步职责。
7. 完成本次改造后，现有玩法语义、题目节奏、胜负判定、页面跳转和结果页读取行为保持不变。
