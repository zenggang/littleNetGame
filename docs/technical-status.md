# 小小数学战场技术状态文档

更新时间：2026-04-15

## 1. 文档目的

这份文档用于记录当前项目的阶段性目标、已实现范围、技术方案、已知问题和后续待办，方便后续继续开发、交接和验收。

## 2. 项目阶段性目标

当前项目目标仍然是首版可玩原型，不是完整商业化产品。

当前阶段重点：

- 跑通 `大厅 -> 房间 -> 对战 -> 结算 -> 回房间` 的完整闭环
- 支持多人在线房间与阵营分配
- 支持 `1v1 / 1v2 / 1v3 / 2v2 / 3v3`
- 用二年级数学题驱动弓箭对战
- 让玩家能明显感受到“答题会立刻转化成攻击效果”
- 先保证能玩、能联机、能结算，再继续优化体验和稳定性

## 3. 当前实现范围

### 3.1 玩法范围

当前首版只支持：

- 年级：`小学二年级`
- 题型：
  - 加法
  - 减法
  - 乘法
  - 整除除法
  - 有余数除法
- 对战模式：
  - `1v1`
  - `1v2`
  - `1v3`
  - `2v2`
  - `3v3`
- 主题：`红蓝两队弓箭手对战`
- 胜负规则：
  - 一方血量归零立即结束
  - 否则时间结束按剩余血量结算

当前不支持：

- 复杂道具
- 复杂职业或兵种
- 聊天系统
- 排行榜
- 观战系统
- 复杂后台管理
- AI 出题

### 3.2 页面范围

当前已有页面：

- `/`
  - 大厅页
  - 创建房间
  - 加入房间
  - 显示支持模式和题型范围
- `/room/[code]`
  - 房间页
  - 展示红蓝队成员
  - 支持换队
  - 房主可开始对战
- `/battle/[matchId]`
  - 对战页
  - 显示红蓝营地、血条、题目、答题区、对战反馈
- `/result/[matchId]`
  - 结算页
  - 显示 winner、血量、答对数
  - 支持再来一局

### 3.3 对战表现范围

当前战斗表现已经实现：

- 红蓝两队营地
- 弓箭手站位
- 血条显示
- 答对后飞箭动画
- 命中后爆点/掉血数字
- 受击红色反馈
- 结算 winner 展示

当前属于“轻量网页战斗表现”，不是完整游戏引擎方案。

### 3.4 移动端适配范围

当前已经做过一轮移动端适配，重点覆盖：

- 首页
- 房间页
- 对战页
- 结算页

目标是保证手机竖屏下：

- 不出现明显横向溢出
- 核心信息仍可读
- 按钮和输入区域可操作

## 4. 当前技术方案

### 4.1 总体平台分工

- 前端：`Next.js 16 + React 19 + TypeScript`
- 部署：`Vercel`
- 数据和实时同步：`Supabase`
- 域名入口和 DNS：`Cloudflare`

当前方案原则：

- 尽量用平台能力完成 MVP
- 不额外引入自建后端
- 不引入重型游戏引擎

### 4.2 前端结构

核心代码位置：

- [src/app/page.tsx](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/app/page.tsx)
- [src/app/room/[code]/page.tsx](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/app/room/[code]/page.tsx)
- [src/app/battle/[matchId]/page.tsx](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/app/battle/[matchId]/page.tsx)
- [src/app/result/[matchId]/page.tsx](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/app/result/[matchId]/page.tsx)

主要职责：

- 页面路由和交互
- 房间状态展示
- 对局状态展示
- 动画表现和答题表单
- 基于 Supabase 快照刷新 UI

### 4.3 游戏规则代码

核心逻辑位置：

- [src/lib/game/config.ts](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/lib/game/config.ts)
- [src/lib/game/questions.ts](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/lib/game/questions.ts)
- [src/lib/game/types.ts](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/lib/game/types.ts)

当前规则实现包括：

- 房间容量：`2 / 3 / 4 / 6`
- 模式识别：`1v1 / 1v2 / 1v3 / 2v2 / 3v3`
- 平衡参数：
  - `1v1`：100 / 100
  - `1v2`：少人数方更高血量和更高伤害倍率
  - `1v3`：少人数方更高血量和更高伤害倍率
  - `2v2 / 3v3`：双方对称
- 题目难度伤害映射：
  - `Lv1 = 6`
  - `Lv2 = 8`
  - `Lv3 = 10`
  - `Lv4 = 12`

### 4.4 Supabase 接入方式

前端 Supabase 接入代码位置：

- [src/lib/supabase/client.ts](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/lib/supabase/client.ts)
- [src/lib/supabase/env.ts](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/lib/supabase/env.ts)
- [src/lib/supabase/game-store.ts](/Users/javababy/Downloads/AI%20demo/littleNetGame/src/lib/supabase/game-store.ts)

当前前端方案：

- 使用 Supabase Browser Client
- 使用匿名登录创建玩家身份
- 前端不直接操作复杂表逻辑，主要通过 RPC 读写
- 页面通过 `snapshot + realtime + 补拉` 维护状态

当前主要 RPC 能力包括：

- `ensure_player_profile`
- `game_create_room`
- `game_join_room`
- `game_switch_team`
- `game_start_match`
- `game_submit_answer`
- `game_tick_match`
- `game_restart_room`
- `game_room_snapshot`
- `game_match_snapshot`

### 4.5 数据库结构

Migration 文件：

- [supabase/migrations/202604130001_init_little_net_game.sql](/Users/javababy/Downloads/AI%20demo/littleNetGame/supabase/migrations/202604130001_init_little_net_game.sql)
- [supabase/migrations/20260413103000_add_game_rpcs.sql](/Users/javababy/Downloads/AI%20demo/littleNetGame/supabase/migrations/20260413103000_add_game_rpcs.sql)
- [supabase/migrations/20260413105500_guard_answer_parsing.sql](/Users/javababy/Downloads/AI%20demo/littleNetGame/supabase/migrations/20260413105500_guard_answer_parsing.sql)

当前主要表：

- `player_profiles`
- `rooms`
- `room_members`
- `matches`
- `match_teams`
- `question_templates`
- `match_questions`
- `answer_submissions`
- `match_events`

当前库侧设计特点：

- 已启用 `RLS`
- 已添加基础索引
- 使用 `security definer` RPC 统一做核心写操作
- 已把关键业务表加入 `supabase_realtime` publication

### 4.6 环境变量

当前只依赖两个前端可见环境变量：

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

模板文件：

- [.env.example](/Users/javababy/Downloads/AI%20demo/littleNetGame/.env.example)

### 4.7 当前实时同步方案

当前实时方案不是纯轮询，也不是纯事件驱动，而是混合方案。

当前链路分为三部分：

- `Supabase Realtime`
  - 负责房间和对局相关表的变更通知
  - 前端收到通知后重新拉取 `snapshot`
- `RPC snapshot`
  - 房间页通过 `game_room_snapshot` 拉完整房间状态
  - 对战页通过 `game_match_snapshot` 拉完整对局状态
- `前端定时推进`
  - 对战页每 `500ms` 调一次 `game_tick_match`
  - 用于推进倒计时、题目超时、切题和结算

当前页面侧策略：

- 房间页：`Realtime + snapshot + 1.5s 低频补拉`
- 对战页：`Realtime + snapshot + 500ms tick`

这套方案的优点：

- 首版实现简单
- 依赖少，适合 Supabase MVP
- 即使 websocket 事件偶发不稳定，也能靠补拉维持基本可用

这套方案的缺点：

- 房间跳转不是纯即时
- 事件到了之后仍然要回库拉快照
- 对局推进依赖前端定时器，不是服务端主导
- 更像“轻实时互动应用”，不是更纯的事件驱动对战架构

### 4.8 实时方案改造建议

这部分是下一阶段的技术改造方向，只是方案，不代表当前已经实现。

目标不是立刻引入自建后端，而是在保留 `Supabase + Vercel` 方案的前提下，把当前“半事件驱动”逐步改成“事件优先、快照兜底”的结构。

建议分三阶段推进。

#### 阶段 A：从“快照主导”改成“事件主导”

目标：

- 保留 Supabase Realtime
- 保留现有数据表和 RPC
- 降低房间页和对战页对频繁补拉快照的依赖

做法：

- 明确事件类型，前端不再把所有变化都当成“收到通知后重新查整张快照”
- 将关键事件标准化，例如：
  - `room_member_joined`
  - `room_team_switched`
  - `match_started`
  - `question_spawned`
  - `answer_wrong`
  - `answer_correct`
  - `damage_applied`
  - `match_finished`
- 前端收到事件后，优先直接更新本地状态
- 仅在以下场景回退拉快照：
  - 首次进入页面
  - 页面刷新
  - 重连恢复
  - 检测到状态不一致

预期效果：

- 房主开始后，其他客户端可更快跳转
- 血量、题号、命中反馈延迟更低
- 减少重复查库

#### 阶段 B：把对局推进从“前端 tick”改成“服务端推进”

目标：

- 不再依赖某个客户端每 `500ms` 调 `game_tick_match`
- 让题目超时、切题、结算更接近服务端权威状态

可选方向：

- 方案 1：继续用 Supabase 能力
  - 由更明确的服务端入口推进状态
  - 前端只触发必要动作，不负责持续 tick
- 方案 2：引入独立轻量对局协调层
  - 例如后续再单独做一个房间协调服务
  - Supabase 负责持久化和结果存储

当前推荐：

- 先做方案 1 的思路收敛
- 现阶段不要直接切到独立游戏网关

原因：

- 当前项目仍处于 MVP 收敛阶段
- 直接拆独立后端会显著提高系统复杂度

#### 阶段 C：评估是否需要独立实时房间服务

只有在下面条件出现时，再考虑脱离当前架构：

- 房间人数明显增多
- 玩法从阵营对战扩展到更细粒度单位行为
- 对命中、切题、战斗演出时序要求显著提高
- 当前 `Supabase Realtime + RPC` 方案成为性能或稳定性瓶颈

到那时，可以考虑：

- 独立 WebSocket 房间服务
- Supabase 退到“存档、房间元数据、结果记录、回放数据”层

当前阶段不建议这样做。

### 4.9 实时改造的结论

对这个项目来说，下一阶段最合适的方向不是改成 `SSE`，而是：

- 继续使用 `WebSocket` 能力
- 继续依赖 Supabase Realtime
- 把同步模型从“通知后查快照”升级为“事件优先、快照兜底”

原因：

- `SSE` 更适合单向推送
- 当前游戏是明显双向交互场景
- WebSocket 更适合房间、分队、答题、切题和结算这些交互动作

因此，后续实时层优化重点应该是：

1. 标准化事件模型
2. 降低快照拉取频率
3. 让服务端对对局推进承担更多权威职责
4. 最后才评估是否需要独立实时后端

## 5. 当前验证状态

本地已做过的基础验证：

- `npm test`
- `npm run lint`
- `npm run build`

测试覆盖当前包括：

- 模式配置
- 对局结算
- 题目生成与判题
- Supabase Realtime 订阅顺序的最小回归测试

当前仍然缺少：

- 完整的浏览器端 E2E 自动化测试
- 真机双浏览器长期联机稳定性回归
- 线上环境自动验收脚本

## 6. 当前已知问题

### 6.1 房间页实时同步稳定性仍需继续观察

之前已经出现过：

- 房主已进入对战页
- 另一位玩家仍停留在等待页

当前代码已经做了两层处理：

- Realtime 订阅前先同步匿名 session 的 access token
- 房间页增加低频补拉快照兜底

这说明当前链路已经不是“纯 websocket 实时”，而是“Realtime + polling fallback”。

后续需要继续确认：

- 是否还有偶发漏跳转
- 是否只在匿名登录和首次订阅阶段更容易出现
- 是否需要按 `4.8 实时方案改造建议` 继续推进到更纯的事件驱动结构

### 6.2 首页和房间页提示文案存在历史残留

当前部分文案仍然像“Supabase 尚未完全接入”，但实际项目已经接入 Supabase 主链路。

需要后续统一更新文案，避免误导。

### 6.3 线上部署链路还不够工程化

当前项目虽然已经能部署到 Vercel，但还缺少：

- 更清晰的发布说明
- 自动化联机回归
- 发布后快速验证 checklist

### 6.4 对战表现仍然是轻量 UI 方案

当前战斗区已经有游戏氛围，但本质仍是 React + CSS 动画方案。

后续如果要继续强化：

- 更复杂的单位动作
- 更丰富的命中特效
- 更平滑的战场演出

需要再评估是否升级到独立 canvas / Phaser 战场层。

## 7. 当前待处理事项

建议按下面优先级推进。

### P0：稳定性

- 继续验证房间到对战页的同步是否稳定
- 补一次真实双浏览器 / 双设备联机回归
- 确认再来一局流程在多人场景下是否稳定

### P1：文案和产品收敛

- 清理历史提示文案
- 明确首页 / 房间页当前真实状态
- 给错误提示做更统一的用户表达

### P1：线上验证能力

- 增加关键路径 E2E
- 至少覆盖：
  - 创建房间
  - 加入房间
  - 开局
  - 非房主跳转到对战
  - 一题答对后掉血
  - 结算页出现

### P2：体验优化

- 继续打磨移动端布局
- 继续优化战斗动效节奏
- 优化答题区与战斗区在小屏下的视觉关系

## 8. 下一阶段建议目标

建议下一阶段目标不要继续扩玩法，而是先收敛现有 MVP。

建议下一阶段只做这几件事：

1. 把多人房间和对战跳转稳定性做扎实
2. 给线上版本补基础 E2E 验收
3. 清理历史提示文案和状态展示
4. 再继续优化移动端和战斗反馈

不建议当前阶段立即扩展：

- 新年级
- 新职业
- 新地图
- 社交系统
- 排行榜
- 商业化

## 9. 一句话总结

当前项目已经完成了一个可联机、可答题、可结算的多人互动数学小游戏首版原型；当前主要矛盾已经从“有没有闭环”转移到“联机稳定性和线上验收能力是否足够可靠”。
