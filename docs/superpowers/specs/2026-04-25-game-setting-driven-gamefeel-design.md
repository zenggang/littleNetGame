# 小小数学战场设定图驱动的游戏感增强规格

> 状态更新：本规格已被 `docs/superpowers/specs/2026-04-25-setting-board-resource-contract.md` 取代为当前执行入口。原因是最新资源已经切换为 `home_bg.png`、`team_bg.png`、`battle_bg.png`、`score_bg.png` 四张完整 16:9 背景图，旧的 `backgroup.png` 五切片路线和已完成勾选不能再作为当前事实。

- 日期：2026-04-25
- 状态：历史规格，保留为上一轮设定方向记录
- 适用流程：`@openspec` / `只规范`
- 设定图：`public/concepts/game-setting-board-2026-04-25.png`
- 场景背景资源：`public/backgroup.png` / `public/background-assets/`
- 前景素材图：`public/imageSheet1.png` / `public/sheet-assets/`
- 资产记录：`docs/superpowers/assets/2026-04-25-little-net-game-setting-board.md`
- 历史对应计划：`docs/superpowers/plans/2026-04-25-game-setting-driven-gamefeel-implementation.md`
- 当前执行规格：`docs/superpowers/specs/2026-04-25-setting-board-resource-contract.md`

## Context

- Background:
  当前项目已经具备 `大厅 -> 房间 -> 对战 -> 结算 -> 再来一局` 主链路，并已完成 `Next.js + Phaser + Cloudflare Durable Objects coordinator + Supabase` 的实时联机底座。当前主要问题已经不是底座能不能跑，而是玩家第一眼和一局内体验仍偏“主题化网页流程”。
- Existing behavior:
  首页仍以昵称输入和创建/加入按钮为核心；房间页仍偏成员列表和等待状态；battle 页已经有 Phaser 舞台和命中演出，但题目控制台仍有表单感；结算页仍偏数据卡和时间线。
- Why this change is needed:
  用户已认可 2026-04-25 生成的六面板设定图，并在 2026-04-25 继续明确要求“按设定图来做这个游戏”。随后补充了两张运行时资源：`imageSheet1.png` 提供 logo、基地、炮塔、按钮、数字弹和控制台组件，`backgroup.png` 提供大厅、编队室、战斗场、答题控制台、胜利战报五个场景底图。

## Goal

- Primary outcome:
  在不重写实时协议、不改变当前核心答题结算规则的前提下，把首页、房间、battle、HUD 和结算统一收敛到设定图定义的游戏化方向，并优先使用 `backgroup.png` 作为五场景底图、`imageSheet1.png` 作为前景资源。
- User-visible result:
  玩家打开首页能立刻看到红蓝对峙的游戏大厅；进房后像进入战前编队室；开战后感知“答题即攻击”；结束后看到战报化胜负收束和明确的再来一局入口。

## Scope

- In scope:
  - 首页大厅视觉与开局入口
  - 创建 / 加入弹窗的开局面板化
  - 房间页战前编队室表达
  - battle Phaser 舞台视觉强化
  - battle DOM HUD 战斗控制台化
  - 结算页战报化
  - 设定图、prompt 和后续规划文档同步
- Affected modules or surfaces:
  - `src/components/game-shell/GameHallScreen.tsx`
  - `src/components/game-shell/GameEntryModal.tsx`
  - `src/components/game-shell/RoomPrepScreen.tsx`
  - `src/app/page.tsx`
  - `src/app/room/[code]/page.tsx`
  - `src/app/battle/[matchId]/page.tsx`
  - `src/app/battle/[matchId]/page.module.css`
  - `src/components/battle-runtime/BattleHud.tsx`
  - `src/components/battle-runtime/PhaserBattleStage.tsx`
  - `src/components/battle-runtime/scenes/BattleScene.ts`
  - `src/app/result/[matchId]/page.tsx`
  - `src/app/result/[matchId]/page.module.css`
  - `src/app/globals.css`
  - `public/concepts/`
  - `docs/superpowers/`

## Non-goals

- Explicitly out of scope:
  - 不重写 `event-first, snapshot-on-demand` 协议
  - 不改 coordinator 权威状态模型
  - 不引入经济系统、成长系统、排行榜或账号体系
  - 不新增复杂英雄、角色或皮肤系统
  - 不把二年级数学内容写死进新的 UI 架构
  - 不在本阶段强行做完整数值平衡或长期留存系统
  - 不把设定图切片误认为最终商用 sprite 或长期资产管线

## Requirements

### Functional

1. 首页必须从“表单入口”转为“游戏大厅”。
   - 首屏主视觉应优先表达红蓝对峙、战场入口和开局动作。
   - 昵称输入不能再成为首屏最高权重元素。
   - 本地 Demo 模式提示必须降级为轻提示，不应压住主视觉。

2. 创建 / 加入流程必须像“开局面板”。
   - 弹窗仍保留，但视觉和文案应从普通表单转向游戏化开局。
   - 房间容量、房间码和确认按钮应保持一屏内完成。
   - 错误反馈仍需清楚，不因游戏化而牺牲可理解性。

3. 房间页必须升级为“战前编队室”。
   - 红蓝阵营应表现为两侧营地或平台，而不是普通列表卡片。
   - 玩家槽位、空位、当前自己所在阵营和可开战状态必须清楚。
   - 房主开战按钮应像“开战”动作，而不是普通提交按钮。

4. battle 页必须强化“答题即攻击”。
   - Phaser 舞台继续是主战场。
   - 正确、答错、超时、终局必须有可见演出。
   - 题目切换应表达“下一发弹药装填”，不能只静默替换文本。

5. battle HUD 必须转为战斗控制台。
   - 题目是弹药卡，输入是装填槽，按钮是发射动作。
   - 伤害、倒计时、冷却和提示文案应像战斗参数。
   - DOM 控制台必须保护中部战场，不应重新挤压 Phaser 主舞台。

6. 结算页必须战报化。
   - 胜方、胜因、关键事件和再来一局必须成为主层级。
   - 统计信息可以保留，但不能继续像普通报表。
   - `再来一局` 必须是最强动作，`返回大厅` 是次级动作。

7. 资产语言必须统一。
   - 红方偏进攻、高温、锐结构。
   - 蓝方偏防御、护盾、稳定结构。
   - 数字箭矢、护盾、命中、连击火花应服务“数学题转化为攻击”的核心表达。

8. 运行时必须先贴近设定图。
   - 首页、房间、battle 舞台、答题控制台、结算页必须优先使用 `public/background-assets/` 的五场景底图。
   - logo、基地、炮塔、士兵、按钮、数字弹、技能图标等前景资源来自 `public/sheet-assets/`。
   - 裁切资源是“垂直体验对齐资源”，用于快速验证游戏观感，不代表最终资产拆分已经完成。
   - 后续若替换成透明 PNG / sprite sheet / Spine / 粒子 FX，必须保持和当前设定图同一视觉语言。

### Behavioral details

- Inputs:
  - 继续沿用当前昵称、房间容量、房间码和答题输入。
  - 不新增需要服务端持久化的新输入字段。
- Outputs:
  - 页面输出更游戏化的状态、演出、战报和反馈文案。
  - 结果页输出仍基于现有 `match_reports` / cached report / snapshot fallback。
- State changes:
  - 本规格阶段默认不改变服务端权威状态。
  - 若后续引入 combo、MVP 或关键一击，优先从现有事件和战报派生；需要持久化的新字段必须另起规格。
- Error handling:
  - 创建房间、加入房间、提交答案、返回房间的错误链路必须保留。
  - 游戏化文案不能掩盖真实错误原因。

## Edge Cases

- 本地 Demo 模式无真实 coordinator 时，首页、房间、battle、结算仍必须可走通。
- 真机竖屏键盘弹起时，battle 控制台不能遮住当前题目和提交按钮。
- 房间只有一方有人或人数未满时，应表达“继续编队”，不能误导为可开战。
- 观战或 viewerTeam 为空时，battle HUD 不能错误标记“你是红队 / 蓝队”。
- `match_reports` 写入延迟或缺失时，结算页仍优先使用可信缓存，不能退回明显陈旧战况。
- 低性能移动设备上，Phaser 演出应保持短促，不做持续高成本粒子堆叠。

## Constraints

- Technical constraints:
  - 保持 `Next.js + React + Phaser` 结构。
  - 继续使用 DOM 承载文字输入和菜单，Phaser 承载主战场。
  - 不把 gameplay 规则直接写进 Scene 回调。
  - 不引入新的大型 UI 框架。
- Compatibility constraints:
  - 保持现有本地 Demo 模式和真实联机模式都可用。
  - 保持现有测试脚本：`npm run test:all`、`npm run lint`、`npm run build`。
  - 保持当前 Supabase / coordinator 环境变量语义不变。
- Performance or operational constraints:
  - battle 页面首屏不能依赖远程大图下载才能可玩。
  - 新增图片资产必须控制尺寸，避免移动端首屏过慢。
  - 动效应尊重 `prefers-reduced-motion`，非关键动效可降级。

## Acceptance Criteria

1. 首页首屏截图不再像昵称表单页，红蓝对峙和开局动作是第一视觉信号。
2. 创建 / 加入弹窗保留原有业务能力，且视觉上像开局面板。
3. 房间页截图能清楚看出“战前编队室”，不是普通等待列表。
4. battle 页截图能清楚看出“上战场，下控制台”，中部战场仍是主角。
5. 正确、答错、超时、终局至少各有一条可见反馈链路。
6. 结算页截图能清楚看出“战报”，并突出胜方、关键事件和再来一局。
7. 本地 Demo 模式完成 `大厅 -> 房间 -> 对战 -> 结算 -> 再来一局` 验证。
8. 真实联机模式相关发布门槛仍以 `docs/verification/game-core-release-checklist.md` 为准。
9. 文档同步完成：本规格、实施计划、current-state 和 checklist 均指向同一阶段目标。

## Assumptions / Open Questions

- Assumption:
  本阶段优先做“设定落地 + 游戏感增强”，不新增服务端 gameplay 字段。
- Assumption:
  MVP、关键一击、连击等战报表达可以先从现有事件派生，不作为强持久化能力。
- Open question:
  是否要在下一阶段之后单独启动“轻量战斗机制”规格，例如 combo、护盾、技能或题目风险等级。
- Open question:
  是否要继续生成一套透明背景 FX 资产：数字箭矢、护盾、命中爆点、连击火花。

## Verification Notes

- Suggested checks:
  - 本地 Demo 多 tab 主流程截图检查
  - 移动端竖屏 390px 宽度截图检查
  - battle 正确 / 答错 / 超时 / 终局手动验证
  - 结果页从 cached report 和 match report 两条路径验证
- Suggested tests:
  - 保持现有 page / component / view-model 测试通过
  - 对新增派生战报字段补 `match-report.test.ts`
  - 对 battle view-model 新增 cue / tone / label 测试
  - 最终跑 `npm run test:all && npm run lint && npm run build`
