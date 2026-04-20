# littleNetGame 当前状态与下一阶段里程

- 日期：2026-04-20
- 状态：当前主参考文档
- 适用阶段：核心主链路已跑通后的状态回看、文档校正、下一阶段里程规划
- 作用：这份文档用于覆盖旧总设计 / 旧总计划里已经过时的“当前事实”描述

---

## 1. 当前状态结论

到当前为止，`littleNetGame` 已经具备一套可跑通的核心联机链路：

- 大厅
- 创建 / 加入房间
- 房间分队
- 对战
- 结算
- 再来一局

这意味着项目已经从“验证方向是否成立”进入“稳定性收口与后续里程规划”阶段。

## 2. 当前真实技术形态

当前真实实现不再是旧文档里描述的 `Supabase Realtime + RPC Snapshot + 前端 tick` 主链路。

当前应以这套架构为准：

- 前端：`Next.js + React + TypeScript`
- 战斗运行时：`Phaser`
- 实时权威层：`Cloudflare Durable Objects coordinator`
- 持久化 / 认证 / 查询：`Supabase`
- 本地验证补充路径：`local demo mode`

### 2.1 两条运行路径

#### A. Local demo mode

触发条件：

- 缺少 `NEXT_PUBLIC_SUPABASE_URL`
- 或缺少 `NEXT_PUBLIC_SUPABASE_ANON_KEY`

能力边界：

- 基于浏览器 `localStorage + sessionStorage`
- 支持多 tab 验证大厅 -> 房间 -> 对战 -> 结算 -> 再来一局
- 用于 UI / 主流程快速验证
- 不能当成真实联机权威路径

#### B. Real online mode

触发条件：

- 前端 Supabase 环境齐全
- coordinator 侧环境齐全

能力边界：

- `Next.js` 负责页面与 coordinator ticket
- `Supabase` 负责匿名登录、持久化数据、历史查询、战报
- `Coordinator` 负责房间/对局权威状态、WebSocket 会话、时钟推进、重连恢复

### 2.2 当前同步策略

当前稳定实现是：

- `snapshot-first`
- `commandId -> command.result`
- battle / room 页面通过 session hooks 消费 snapshot

事件模型已经存在，但还不是全项目的主同步协议。

## 3. 已完成的阶段判断

按 2026-04-16 旧总设计里的四个里程碑看，当前状态可以这样判断：

### M1 游戏化外壳重建

主体已完成：

- 首页大厅
- 创建 / 加入入口
- 房间准备室
- 竖屏游戏化页面骨架

### M2 战斗表现层重建

主体已完成：

- battle 主舞台
- `上战场，下操作台`
- 发箭 / 命中 / 超时 / 收束等主要战斗反馈

仍可继续做 polish，但不再属于“是否成立”的问题。

### M3 实时对局基座重建

主体已完成：

- coordinator 接管权威对局状态
- WebSocket 会话
- 本地 demo / 真实联机双路径
- 关键结果链路收口

### M4 结算与持续迭代能力

已部分完成，但还没有完全封板。

当前缺口主要在：

- 发布门槛验证
- 日志和异常清理
- `match_reports` 持久化环境一致性
- 跨页面 / 跨会话结果一致性

## 4. 当前仍需明确收口的问题

以下不是“架构还没做”，而是“上线门槛还没彻底收口”：

1. 双设备竖屏联机回归
2. 弱网断线重连回归
3. coordinator 运行日志无未处理异常
4. `match_reports` 在目标环境真实存在并正常写入
5. 结果页在刷新 / 新标签打开场景下仍能读到可信终局数据
6. `npm run lint` 当前会被 `.worktrees/.../.next` 生成文件拖失败，需要单独治理

## 5. 文档状态调整原则

从现在开始，以下文档应按“历史文档”理解，而不是“当前真相”：

- `docs/superpowers/specs/2026-04-16-pure-game-core-rebuild-design.md`
- `docs/superpowers/plans/2026-04-16-pure-game-core-rebuild-implementation.md`
- `docs/superpowers/specs/2026-04-16-battle-game-feel-polish-design.md`

它们仍然保留价值，但主要价值是：

- 解释当时为什么这样设计
- 记录阶段性目标和边界
- 作为回看资料

不再适合作为“当前状态说明”。

## 6. 下一阶段里程建议

### M1：稳定性与发布门槛

目标：

- 把“能跑”变成“可稳定验证、可持续上线”

重点：

- 双设备联机验证
- 弱网断线重连验证
- coordinator logs 收口
- `match_reports` migration 与持久化闭环
- 结果页跨刷新 / 跨标签一致性
- `.worktrees` 与 `.next` 对 lint 的污染治理

### M2：内容与规则抽象

目标：

- 把“二年级数学对战”升级成“可换内容包的战斗底座”

重点：

- content pack / ruleset 分层
- 学科、年级、题型、输入组件解耦
- 房间配置与内容配置拆分
- 结果页与战报字段稳定化

### M3：同步与可观测性增强

目标：

- 为后续复杂玩法和稳定线上排障做准备

重点：

- 是否从 `snapshot-first` 逐步演进到 `snapshot + event hybrid`
- 命令幂等与重放保护
- 对局状态与关键事件可观测性
- 更精确的 coordinator / 持久层故障定位

### M4：产品层迭代

目标：

- 在底座稳定后，开始做真正的产品增量，而不是继续修基建

候选方向：

- 邀请与开房体验增强
- 结算战报增强
- 排行榜 / 历史记录
- 更丰富的题包 / 模式

## 7. 当前推荐的 OpenSpec 使用节奏

- 小 bug / 小修复：直接 `只工程`
- 新阶段启动前：先 `只规范`
- 跨模块中型改造：`全流程`
- 完成一个阶段后：立即回填这份当前状态文档与 `docs/verification/game-core-release-checklist.md`

## 8. 当前最小文档集合

以后默认优先维护这几份：

- `README.md`
- `docs/superpowers/specs/2026-04-20-game-core-current-state-and-next-milestones.md`
- `docs/verification/game-core-release-checklist.md`

如果改动会让旧 spec / 旧 plan 的顶部状态失真，再同步修正它们的状态说明。
