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

## Optimization Targets

- 降低 coordinator 常规广播的平均消息体积与峰值消息体积。
- 降低一次对局中的全量 snapshot 广播次数。
- 降低前端因为整包 snapshot 更新导致的无关重派生与重渲染。
- 降低 DO storage checkpoint 的高频写入次数。
- 为后续移除客户端 `match.tick` 兜底和页面轮询补偿建立协议基础。
- 为后续增加更细粒度的时延埋点、恢复能力和复杂玩法留出清晰的协议边界。

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

## Requirements

### Functional

1. coordinator 必须支持以事件为主的常规同步路径；高频状态变化默认不再广播整包 `room.snapshot + match.snapshot`。
2. coordinator 必须把房间态与对局态广播拆开，避免房间变化无谓携带对局数据，对局变化无谓携带房间数据。
3. 新连接、重连、显式同步请求、检测到序列号跳变时，服务端必须能够返回可信的 snapshot 基线。
4. 客户端必须保存最近一次已应用的 `seq`，并在发现 gap 时主动发起同步请求。
5. 前端必须能在不依赖整包 snapshot 的情况下，基于协议事件持续驱动房间页和战斗页的主要状态更新。
6. coordinator checkpoint 必须从“多数动作立刻整包写”调整为“节流写 + 关键节点强制写”。
7. 服务端时间推进的权威性必须继续集中在 `alarm()` 与服务端校正逻辑，不允许把客户端 `match.tick` 继续当作长期主推进方案。

### Behavioral details

- Inputs:
  - 房间命令：`room.join`、`room.switch_team`、`room.start_match`、`room.restart`
  - 对局命令：`match.submit_answer`
  - 恢复命令：新增 `sync.request`
  - 过渡期内允许保留 `match.tick`，但它只能作为兼容入口，不能继续扩大依赖面
- Outputs:
  - 常规房间事件：成员加入、换队、开局、重开等轻量事件
  - 常规对局事件：开题、答题结算、超时、结束等带 `seq` 的事件
  - 初始化 / 恢复消息：`room.snapshot`、`match.snapshot`
  - 命令响应：`command.result`
- State changes:
  - 服务端先以内存态为权威更新，再广播事件，再安排 checkpoint / 非关键持久化
  - 客户端对房间态和对局态分别维护局部可更新状态，并基于事件 reducer 累积演进
  - snapshot 只负责建立或重建可信基线，不再承担所有实时推进职责
- Error handling:
  - 客户端收到重复事件或旧事件时，必须忽略而不是回滚状态
  - 客户端检测到 gap 时，必须停止继续乐观应用后续依赖性事件并主动请求同步
  - 服务端在恢复或同步时若发现房间/对局已不存在，必须返回明确空态或错误态，而不是沉默失败
  - 非关键持久化失败不能阻塞玩家已经发生的实时反馈，但需要留下可观测日志

## Phase Plan

### Phase 1: 主通道切换

- 目标：
  - 把 match 事件真正接入 websocket 主通道，并拆开 room/match 广播
- 预期收益：
  - 立刻减少高频全量广播
  - 为前端事件消费建立真实输入源

### Phase 2: 前端事件消费与 checkpoint 节流

- 目标：
  - 前端按事件更新局部状态
  - DO storage checkpoint 改成节流写
- 预期收益：
  - 减少页面整包更新带来的无效重派生
  - 减少高频状态变化导致的存储写放大

### Phase 3: 恢复协议收口

- 目标：
  - 建立 `seq + gap detection + sync.request + snapshot resync`
  - 移除 battle / room 页的轮询补偿和 `match.tick` 长期依赖
- 预期收益：
  - 明确“消息丢了怎么办”
  - 真正结束“怕丢就不断发快照”的粗放同步方式

## Edge Cases

- 新玩家在房间页连上时，房间还没开局，只应收到房间基线和必要房间事件，不应收到不存在的对局事件。
- 玩家在倒计时末尾或题目截止边界提交答案时，服务端必须先做权威时间校正，再决定接受/拒绝答案，不能让客户端事件顺序污染裁决。
- 当一个对局事件引发终局时，客户端必须能够在应用终局事件后正确进入 finished 态，而不是被后到达的旧快照或旧事件覆盖。
- 重连时如果房间已经重开或对局已结束，客户端必须接受新的基线，而不是保留旧的 battle 本地态。
- 房间成员在 websocket 连接前已通过其他链路写入数据库时，服务端冷启动恢复仍必须能建立正确房间基线。
- 节流 checkpoint 窗口内如果 DO 冷重启，允许丢失窗口期内的非关键热状态，但不能破坏开局、结束、成员变更等关键恢复节点。

## Constraints

- Technical constraints:
  - 必须复用当前 `MatchRoom`、`match-engine`、前端 session hooks 的现有结构，优先做小步演进，不做大规模重写。
  - 必须兼容现有 `commandId -> command.result` 命令响应模型。
  - 必须保留 local demo mode 与 real online mode 的双路径，不允许只修在线模式。
- Compatibility constraints:
  - 过渡期内允许 snapshot 与 event 并行存在，但最终行为必须对当前页面路由和业务语义保持兼容。
  - 不允许破坏现有 battle 页、room 页、result 页的数据读取边界。
- Performance or operational constraints:
  - 常规高频路径应优先执行：内存更新 -> 事件广播 -> 后续落盘
  - 不允许把 Supabase 写入重新引回每次题目推进、每次答题都同步等待的模式
  - 必须为后续埋点留出时间戳与序列号位置，便于定位网络、服务端处理、广播和前端渲染延迟

## Acceptance Criteria

1. 在 room.join、room.switch_team、match.submit_answer、question timeout、match finish 等常规高频路径下，不再默认向全房广播整包 `room.snapshot + match.snapshot`。
2. battle 页能够基于真实 websocket 事件持续更新当前题目、血量、终局状态；`reduceMatchEvent()` 等协议 reducer 不再是闲置代码。
3. room 页能够基于房间事件更新成员列表、队伍归属、开局状态，而不是仅靠整包房间快照反复覆盖。
4. snapshot 只在以下场景作为必要补偿使用：新连接、重连恢复、显式同步请求、序列号跳变恢复。
5. `persistCheckpoint()` 不再在每次高频动作后直接整包写入；存在节流策略，并保留开局、成员变更、重开、结束等关键节点强制落盘。
6. battle 页和 room 页现有轮询补偿在协议稳定后被移除或显著降级，不再承担长期主同步职责。
7. 完成本次改造后，现有玩法语义、题目节奏、胜负判定、页面跳转和结果页读取行为保持不变。

## Assumptions / Open Questions

- Assumption:
  - 当前最大的体感瓶颈主要来自全量广播与前端整包消费，而不是 Supabase 单次边界写本身。
  - 当前仓库已有的 `MatchEvent`、`reduceMatchEvent()`、`MatchState` 足够作为对局侧事件协议的第一版基础。
- Open question:
  - 房间态事件是否需要单独定义 `RoomEvent` 类型，还是先以内聚的轻量消息结构落地，再视复杂度抽象。
  - `match.snapshot` 是否直接带 `lastSeq`，还是由更通用的 snapshot metadata 承载恢复基线。
  - 是否需要在 Phase 2 或 Phase 3 同时补一版最小可用埋点，用于量化广播与渲染耗时收益。

## Verification Notes

- Suggested checks:
  - 统计单局对战在改造前后的总消息数、snapshot 次数、平均消息体积、峰值消息体积
  - 统计单局对战在改造前后的 DO checkpoint 写入次数
  - 人工模拟 `seq` 跳变，确认客户端能主动 `sync.request` 并恢复正确基线
  - 断线重连后验证房间页、战斗页都能恢复到当前正确状态
- Suggested tests:
  - `MatchRoom` 单测：事件广播与 snapshot 广播触发条件
  - `useMatchSession` / `useRoomSession` 单测：事件应用、gap 检测、resync 行为
  - 协议 reducer 单测：重复事件、旧事件、跳号恢复、终局覆盖顺序
  - battle / room 页面集成测试：不依赖高频 snapshot 仍可完成主流程
