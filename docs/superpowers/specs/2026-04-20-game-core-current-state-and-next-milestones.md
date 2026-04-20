# littleNetGame 当前状态与下一阶段里程

- 日期：2026-04-20
- 状态：当前主参考文档
- 适用阶段：核心主链路已跑通后的状态回看、文档校正、下一阶段里程规划
- 作用：这份文档用于覆盖旧总设计 / 旧总计划里已经过时的“当前事实”描述

---

## 1. 当前状态结论

到当前为止，`littleNetGame` 已经具备一套可跑通且进入稳定性收口阶段的核心联机链路：

- 大厅
- 创建 / 加入房间
- 房间分队
- 对战
- 结算
- 再来一局

当前主问题已经不是“方向是否成立”，而是：

- 实时同步是否足够轻
- 弱网与重连恢复是否足够稳
- 发布门槛与可观测性是否足够清楚

## 2. 当前真实技术形态

当前真实实现应以这套架构为准：

- 前端：`Next.js + React + TypeScript`
- 战斗运行时：`Phaser`
- 实时权威层：`Cloudflare Durable Objects coordinator`
- 公网接入层：当生产 `COORDINATOR_BASE_URL` 仍为 `*.workers.dev` 时，
  由 `Next.js/Vercel` 提供同域 `/api/coordinator-bridge/*` HTTP bridge，
  服务端代签名并代调 coordinator，避免客户端直连不可达域名
- 持久化 / 认证 / 查询：`Supabase`
- 本地验证补充路径：`local demo mode`

## 3. 当前同步策略

当前主实时同步已经不是旧文档里的 `RPC snapshot + 前端 tick`，也不再是早期过渡阶段的 `snapshot-first`。

当前应以这套策略为准：

- `event-first, snapshot-on-demand`
- 房间态与对局态广播拆分
- 常规房间变化走 `room.event`
- 常规对局变化走 `match.event`
- 新连接、重连、显式同步请求才补 `room.snapshot` / `match.snapshot`
- 前端 `useRoomSession` / `useMatchSession` 已能消费协议事件并局部推进状态
- 浏览器不再被要求直接访问 `*.workers.dev`；必要时可退到主站同域 bridge

这意味着：

- 房间页不再依赖高频轮询拉房间快照
- battle 页不再依赖定时 `match.tick + loadSnapshot` 催服务端推进
- coordinator 的 checkpoint 不再是每次高频动作都整包写

## 4. 当前已完成的收口

除核心主链路跑通外，当前已经补到：

- `match-engine` 协议事件真正接入 websocket 主通道
- 房间事件模型接入 room session
- battle 页按事件推进题目、血量、终局状态
- 最小 `seq gap -> sync.request -> snapshot resync` 恢复闭环
- 页面层长期轮询补偿移除，只保留首屏拉取与必要恢复入口

## 5. 当前仍需继续验证的门槛

以下工作仍然重要，但性质属于“上线门槛与观测收口”，不是“底座没建成”：

1. 双设备竖屏联机回归
2. 弱网断线重连回归
3. coordinator logs 无未处理异常
4. `match_reports` 在目标环境真实存在并正常写入
5. 事件主通道下的端到端时延埋点与观察口径补齐

## 6. 下一阶段里程建议

### M1：发布门槛与恢复验证

目标：

- 把 event-first 实时链路在真实设备和弱网环境下验稳

重点：

- 双设备联机验证
- 断线 / 重连 / 跳 seq 恢复验证
- coordinator logs 收口
- `match_reports` 目标环境一致性
- 主站同域 coordinator bridge 在生产真实可达

### M2：协议可观测性与埋点

目标：

- 为后续复杂玩法和线上排障提供明确指标

重点：

- client send / worker receive / state apply / broadcast / peer receive / render done 的链路埋点
- 消息数、消息体积、checkpoint 次数观测
- 关键恢复路径告警

### M3：内容与玩法扩展

目标：

- 在 event-first 底座稳定后，继续做内容包、规则和玩法扩展

重点：

- content pack / ruleset 分层
- 结果页与战报字段稳定化
- 观战 / 回放 / 排行等更复杂能力的可行性评估

## 7. 当前推荐的 OpenSpec 使用节奏

- 小 bug / 小修复：直接 `只工程`
- 新阶段启动前：先 `只规范`
- 跨模块中型改造：`全流程`
- 完成一个阶段后：立即回填这份当前状态文档与 `docs/verification/game-core-release-checklist.md`
