# 小小数学战场设定图与资源语义化落地规范

- 日期：2026-04-25
- 状态：当前活跃规格，替代 `2026-04-25-game-setting-driven-gamefeel-design.md` 作为下一轮执行入口
- 适用流程：`@openspec` / `只规范`
- 设定目标：`public/concepts/game-setting-board-2026-04-25.png`
- 当前背景资源：`public/home_bg.png`、`public/team_bg.png`、`public/battle_bg.png`、`public/score_bg.png`
- 历史背景源图：`public/backgroup.png`，仅保留为旧尝试记录，不再作为本轮切图输入
- 元素源图：`public/imageSheet1.png`
- 执行原则：背景图不再切图；背景必须全屏铺满；先锁资源语义、manifest 和截图验收，再允许页面适配

## Context

- Background:
  当前项目已经跑通 `大厅 -> 房间 -> 对战 -> 结算 -> 再来一局`，技术底座仍是 `Next.js + React DOM HUD + Phaser 战场 + coordinator`。这条底座不是本轮问题。
- Existing behavior:
  上一轮把 `backgroup.png` 切出 5 张背景，也从 `imageSheet1.png` 切出若干前景资源，但实现方式仍是旧网页结构：大背景 + DOM 卡片 + CSS 按钮 + 少量前景贴图。用户反馈成立：这不是按设定图改造游戏，而是把资源当装饰塞进网页。
- Latest asset update:
  用户已经重新生成 4 张完整 16:9 手游画幅背景：`home_bg.png`、`team_bg.png`、`battle_bg.png`、`score_bg.png`，尺寸均为 `1672x941`。其中 `battle_bg.png` 已经把“上半区战斗、下半区答案选择”放进同一张全屏图，后续不再需要从 `backgroup.png` 切场景，也不应把 battle 拆成战场背景和控制台背景两套。
- Why this change is needed:
  `game-setting-board-2026-04-25.png` 是目标构图，4 张 `*_bg.png` 是当前运行时页面背景，`imageSheet1.png` 是 UI / 单位 / FX 元素图。它们必须被定义成运行时契约，而不是可自由发挥的素材库。

## Goal

- Primary outcome:
  产出一套可执行的游戏视觉与资源语义规范，让后续 agent 能按同一标准完成 manifest、元素切片、页面适配和截图验收。
- User-visible result:
  下一轮实现后的截图必须接近设定图和最新 4 张背景：大厅像游戏大厅，房间像战前编队室，battle 是上战场下数字装填区，结算是胜利战报，而不是网页卡片套皮。

## Scope

- In scope:
  - 玩家幻想、核心动词和一局循环
  - 4 张完整背景图的运行时映射规范
  - `imageSheet1.png` 的元素分组、命名、必用清单和禁用方式
  - React DOM 与 Phaser 的资源分层边界
  - battle 下半区答题输入统一为数字选择 / 装填模式
  - 多 agent 后续实施边界
  - 截图验收标准
- Affected modules or surfaces:
  - `public/home_bg.png`
  - `public/team_bg.png`
  - `public/battle_bg.png`
  - `public/score_bg.png`
  - `public/imageSheet1.png`
  - `public/game-assets/`
  - `src/lib/game/assets/`
  - 大厅、创建/加入面板、房间编队室、battle 舞台、答题控制台、结果战报
  - 相关测试、文档和浏览器视觉验收

## Non-goals

- Explicitly out of scope:
  - 不重写实时协议、coordinator、Supabase 持久化或房间/对局状态模型
  - 不改变二年级数学题生成、判题和结算真值
  - 不把余数题改成单字段答案；`quotient/remainder` 双字段真值保持不变
  - 不把所有 UI 强行塞进 Phaser；文字密集区仍优先 DOM
  - 不新增账号、成长、商城、排行榜
  - 不在本阶段做长期商用资产管线；当前目标是把已有背景图和元素图语义化落地
  - 不把截图中的静态文案、血量、房间号、题目、MVP 数据直接烘焙成运行时 UI

## Requirements

### Functional

1. 玩家幻想必须统一。
   - 玩家是小指挥官，不是在网页里做题。
   - 核心动词是：开房、拉人、列阵、装填、发射、命中、防守、复盘、再来一局。
   - 答对数学题必须被表达为给炮塔装填数字箭矢并攻击对方基地。

2. 资源源图必须分工明确。
   - `game-setting-board-2026-04-25.png` 是目标构图，不直接作为运行时资产。
   - `home_bg.png` 是首页 / 大厅运行时全屏背景。
   - `team_bg.png` 是房间 / 战前编队室运行时全屏背景。
   - `battle_bg.png` 是 battle 运行时全屏背景，包含上半区战场和下半区答案选择区。
   - `score_bg.png` 是结算 / 战报运行时全屏背景。
   - `backgroup.png` 是被最新背景图替代的历史源图，不再作为本轮切图输入。
   - `imageSheet1.png` 负责 logo、按钮、面板、单位、HUD、技能、FX 和战报组件。
   - 源图不应被组件直接引用；运行时应引用 `public/game-assets/` 的派生资源和 manifest。

3. 新资源目录必须语义化。
   - 4 张背景图不得再次裁切。运行时可以复制到 `public/game-assets/scenes/`，但必须保持完整画幅和原始构图。
   - 元素图派生资源放入：
     - `public/game-assets/ui/`
     - `public/game-assets/units/`
     - `public/game-assets/fx/`
   - 每个资源必须进入 `src/lib/game/assets/asset-manifest.ts` 或等价 manifest。
   - manifest 至少记录：资源 key、路径、来源源图、源图坐标、原始尺寸、用途、允许缩放方式、是否可交互、是否可动画。
   - 背景类 manifest 还必须记录：`sourceSize`、`aspect`、`fitPolicy`、`safeZones`、`runtimeLayer`。

4. 背景图必须完整铺满并保留主体构图。
   - 首页使用 `scene.home.main`，必须保留标题区、战场入口和主按钮区域。
   - 编队使用 `scene.team.prepare`，必须保留左右阵营、中央对抗关系和底部开战动线。
   - 战斗使用 `scene.battle.play`，必须把上半区战斗和下半区答案选择作为一张完整背景处理；禁止把下半区重新盖成普通表单。
   - 战报使用 `scene.score.report`，必须保留胜利横幅、战报主体和核心行动区。
   - 主运行页面默认使用 `full-bleed-cover`：背景必须铺满可视屏幕，不能出现外层网页留白。构图保护通过安全区、焦点定位和 DOM 覆盖层完成，禁止把关键左右阵营、底部控制台或战报主区域盖掉。

5. 四个主页面必须复刻设定图的界面职责。
   - 大厅：主视觉是城堡广场 + logo + 开始对战 + 创建/加入入口；指挥官输入降级，不能成为主角。
   - 编队室：主体是红蓝阵营台 + 玩家槽 + ready 状态 + VS；房间信息只是顶部小牌。
   - 战斗：同屏上方是完整战场，红左蓝右，中间是攻击路线；下方是答案选择 / 装填控制台。
   - 战报：顶部胜利横幅/皇冠/MVP，主体是数据对比和关键命中时间轴，再来一局是最强动作。

6. Battle 分层必须匹配 `battle_bg.png`。
   - React 页面承载整张 `scene.battle.play` 背景。
   - Phaser 只覆盖上半战场安全区，负责投射物、命中、护盾、伤害、血量状态和短动效。
   - DOM HUD 覆盖下半答案控制台安全区，负责题目、数字选择、答案槽、发射按钮和禁用态。
   - `battle_bg.png` 已含静态基地 / 炮塔 / 控制台时，Phaser 不得再重复叠完整静态基地、道路、炮塔底座。

7. 答题输入必须统一为数字选择 / 装填模式。
   - 普通整数答案题不再使用自由文本输入，必须使用数字按钮、候选数字卡或数字键盘填入答案槽。
   - 除法余数题也必须改成选数字模式：保留 `商`、`余数` 两个语义槽，但每个槽通过点击数字按钮填充，不使用文本框。
   - 余数题提交 payload 仍为 `{ quotient, remainder }`，不能改成单个 `value`。
   - 最小候选数字为 `0-9`。当前二年级余数题商和余数都在单 digit 范围内；未来扩到两位数时另起输入规格。
   - 未选满必要槽位时，`发射箭矢` 默认禁用。禁用态必须可见，且不得触发错误提交。
   - 删除 / 重选 / 清空必须可见，避免玩家点错数字后只能刷新。

8. 元素图必须真实参与运行时。
   - 大厅必须使用 logo、开始/创建/加入按钮、红蓝基地或塔、至少一个红蓝角色或士兵元素。
   - 编队必须使用红蓝旗台或阵营 banner、VS 徽章、房主开始按钮、准备/邀请按钮样式。
   - 战斗必须使用红蓝 HUD 条、时间条、数字箭矢/伤害 FX、护盾/命中 FX；不能只用 Phaser graphics 画全部效果。
   - 控制台必须使用答案槽/数字键/发射按钮/技能按钮中的核心元素，并覆盖到 `battle_bg.png` 下半区。
   - 战报必须使用胜利 banner、MVP 勋章、战报面板、再来一局/返回大厅/分享战报按钮。

9. 资源使用必须避免当前反例。
   - 禁止只说“引用了图片路径”就算接入。
   - 禁止重新切 4 张 `*_bg.png` 背景图。
   - 禁止把完整页面背景做成居中卡片或外层渐变底图；全屏铺满是默认要求。
   - 禁止大白卡覆盖战场或战报主体。
   - 禁止在战斗背景已有基地/炮塔时再重复叠同类静态基地，造成发虚和错位。
   - 禁止用 CSS 重新画设定图已有的按钮、答案槽、VS、血条、发射按钮。
   - 禁止使用带棋盘格底的前景资源；必须去底或重新切出透明资源。
   - 禁止把静态文字/题目/血量/房间号/MVP 数据烘焙在动态 UI 图片里。

### Behavioral Details

- Inputs:
  - 沿用现有昵称、房间码、房间容量、队伍选择、答题输入。
  - 不新增需要服务端保存的新字段。
- Outputs:
  - 页面输出要从普通表单/卡片转成游戏画面：按钮、状态、题目、战报都应该像游戏系统。
  - UI 文案只做动态覆盖，不替代资源结构。
- State changes:
  - 核心战斗状态仍由现有 room/match/report 数据驱动。
  - 连击、MVP、关键一击可先从现有事件派生；需要持久化时另起规格。
- Error handling:
  - 创建、加入、开战、提交答案、返回房间失败必须保留清晰反馈。
  - 错误提示可以游戏化，但不能遮盖真实错误原因。

## Scene And Asset Contract

### 完整背景资源

| 目标 key | 目标文件 | 来源 | 尺寸 | 用途 | fit 规则 |
|---|---|---|---|---|---|
| `scene.home.main` | `public/game-assets/scenes/home-bg.png` | `public/home_bg.png` | 1672x941 | 首页大厅主视觉 | `full-bleed-cover`，铺满屏幕并保留标题/战场/主按钮视觉重心 |
| `scene.team.prepare` | `public/game-assets/scenes/team-bg.png` | `public/team_bg.png` | 1672x941 | 房间编队室 | `full-bleed-cover`，铺满屏幕并保留左右阵营视觉重心 |
| `scene.battle.play` | `public/game-assets/scenes/battle-bg.png` | `public/battle_bg.png` | 1672x941 | 战斗场 + 答题控制台 | `full-bleed-cover`，Phaser 上半安全区，DOM 下半安全区 |
| `scene.score.report` | `public/game-assets/scenes/score-bg.png` | `public/score_bg.png` | 1672x941 | 胜利战报 | `full-bleed-cover`，铺满屏幕并保留横幅/战报主体 |

### 元素资源分组

- `ui.*`：
  logo、按钮、血条、时间条、答案槽、数字键、运算符键、弹窗、banner、VS、MVP、战报面板。
  如果按钮切片分辨率不足或放大后文字发虚，运行时必须优先使用 CSS 绘制同风格游戏按钮，不能为了“用资源”牺牲清晰度。
- `units.*`：
  红蓝基地、红蓝炮塔、红蓝旗台、红蓝士兵、道路/河道小块、木栅栏、石头、草丛。
- `fx.*`：
  红蓝数字箭矢、伤害数字、暴击、连击、护盾、治疗、爆炸、发射轨迹、命中烟雾。

### 必须优先补齐的资源

1. 大厅：
   - `ui.logo.main`
   - `ui.button.create` / `ui.button.join` 仅作为风格参考；当前运行按钮使用高清 CSS 重绘
   - `units.base.red.main`
   - `units.base.blue.main`
   - `units.soldier.red.*`
   - `units.soldier.blue.*`

2. 编队：
   - `units.platform.red.camp`
   - `units.platform.blue.camp`
   - `ui.badge.vs`
   - `ui.banner.red`
   - `ui.banner.blue`
   - `ui.button.hostStart` 仅作为风格参考；当前运行按钮使用高清 CSS 重绘
   - `ui.button.invite`
   - `ui.button.ready`

3. 战斗：
   - `ui.hud.hp.red`
   - `ui.hud.hp.blue`
   - `ui.hud.timer`
   - `fx.arrow.red.*`
   - `fx.arrow.blue.*`
   - `fx.shield`
   - `fx.burst`
   - `fx.combo`
   - `units.soldier.red.*`
   - `units.soldier.blue.*`

4. 控制台：
   - `ui.question.screen`
   - `ui.answer.slot`
   - `ui.digit.0` 到 `ui.digit.9`
   - `ui.button.clear`
   - `ui.button.fire`
   - `ui.skill.shield`
   - `ui.skill.heal`
   - `ui.skill.burst`
   - `ui.skill.combo`

5. 战报：
   - `ui.result.banner.redVictory`
   - `ui.result.banner.blueVictory`
   - `ui.medal.mvp`
   - `ui.result.comparePanel`
   - `ui.result.timeline` 只用于数据足够复杂时；默认结算页保持简洁信息区
   - `ui.button.rematch`
   - `ui.button.lobby`
   - `ui.button.share`

## Edge Cases

- 本地 Demo 只有 1 人时，房间页仍要像编队室，但明确显示缺人和不可开战。
- battle 背景已有静态基地/炮塔时，动态前景只能用于炮口、伤害、护盾、士兵、状态覆盖；不得重复堆静态基地。
- 除法余数题必须使用 `商槽 + 余数槽 + 数字键`，不能保留文本输入框。
- 小屏竖屏下，控制台可以压缩高度，但必须保留大题目屏、答案槽、数字键和发射按钮。
- 战斗答题题面、答案选项和发射按钮必须落在 `battle_bg.png` 下半控制台安全区内，不能另起浮层表单。
- `imageSheet1.png` 的棋盘底若不是真实透明通道，切片必须去底；如果无法可靠去底，该元素不能作为最终运行时前景。
- 结果页缺少战报持久化时，仍沿用 cached report fallback，但视觉结构不能退回普通卡片；默认只展示胜方、败方、四项核心数据、胜因、MVP 和关键一击。

## Constraints

- Technical constraints:
  - 保持 React DOM 处理文字密集 HUD 和菜单。
  - 保持 Phaser 处理主战场、投射物、命中、屏幕震动和短动效。
  - 游戏规则仍在现有 state/view-model 层，不写进 Phaser scene。
  - 页面资源只能通过 manifest 或明确资产模块引用，避免到处硬编码路径。
- Compatibility constraints:
  - 本地 Demo 模式和真实联机模式都必须继续可用。
  - 现有测试命令仍为 `npm run test:all`、`npm run lint`、`npm run build`。
  - 旧 `public/background-assets/`、`public/sheet-assets/` 可暂留，但下一轮实现不应继续作为主要运行时入口。
- Performance or operational constraints:
  - 单个背景图保持当前 1672x941 尺寸，不引入远程依赖。
  - FX 动画短促，不持续堆叠大粒子。
  - 非关键动效尊重 `prefers-reduced-motion`。

## Acceptance Criteria

1. 资源审计通过：
   - 4 张背景通过 manifest 进入运行时主入口。
   - `src` 里不再只有少量前景资源引用；主流程必须真实引用大厅、编队、战斗、控制台、战报的必用资源。
   - 运行时入口优先来自 `public/game-assets/` 和 manifest，而不是散落的旧 `sheet-assets` / `background-assets` 路径。
2. 大厅截图通过：
   - 首屏可见 logo、红蓝基地/塔、开始对战、创建/加入入口。
   - 指挥官输入不抢主视觉。
3. 编队截图通过：
   - 红蓝营地左右对阵，中央有 VS。
   - 玩家槽挂在阵营区域内，不是普通列表卡。
   - 房间号、人数、邀请、开战清楚但不压过营地。
4. 战斗截图通过：
   - `battle_bg.png` 的上半战场和下半答题区完整可见。
   - Phaser 动态层只叠投射物、伤害、护盾、血量状态等动态元素，不重复静态基地/炮塔。
   - 至少能截图到数字箭矢、伤害或护盾反馈。
5. 控制台截图通过：
   - 一眼像战斗控制台，而不是表单。
   - 大题目屏、答案槽、数字键、发射按钮、技能/能量区可见。
   - 余数题显示 `商` 与 `余数` 双槽，并通过数字键填充。
6. 战报截图通过：
   - 胜利横幅、MVP、数据对比、关键命中时间轴和再来一局可见。
   - 页面不能被普通白色统计卡片主导。
7. 交互链路通过：
   - 本地 Demo 能走到大厅、房间、battle、result。
   - 单数字题、余数题、正确、答错、超时、终局至少各有一种可见反馈。
8. 自动门禁通过：
   - `npm run test:all`
   - `npm run lint`
   - `npm run build`

## Assumptions / Open Questions

- Assumption:
  下一轮仍使用现有 React + Phaser 架构，不改成全 Phaser 单体游戏。
- Assumption:
  当前资源图可通过人工坐标和去底处理获得可用前景元素；若部分元素边缘不可用，应保留在 manifest 中标记为 `blocked`，不能硬接。
- Assumption:
  当前余数题商和余数均在 `0-9` 范围内，数字键最小实现足够覆盖现有题库。
- Confirmed:
  `sips -g hasAlpha public/imageSheet1.png` 显示 `hasAlpha: no`。元素图没有真实透明通道，所有前景切片必须去底；若去底质量不稳定，应重新导出透明 PNG。
- Open question:
  连击、护盾、治疗是否只是视觉反馈，还是要进入真实 gameplay 数值；本规格默认只做视觉反馈。

## Verification Notes

- Suggested checks:
  - `rg '/sheet-assets/|/background-assets/' src` 检查旧散路径是否被淘汰。
  - `find public/game-assets -type f` 检查新资源目录是否按 `scenes/ui/units/fx` 分组。
  - 检查 manifest 每个 key 是否有来源坐标和用途。
  - 浏览器截图逐张对照设定图和 4 张最新背景图。
- Suggested tests:
  - 保留现有 page/component/view-model 测试。
  - 新增或更新资产 manifest 测试，确保关键 key 存在。
  - 新增 `QuestionForm` 余数题数字选择测试，确保提交 `{ quotient, remainder }`。
  - 新增 battle asset preload 测试，确保 Phaser 使用 manifest key。
  - 最终跑 `npm run test:all && npm run lint && npm run build`。
