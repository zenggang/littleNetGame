# little-net-game 游戏设定图记录

- 日期：2026-04-25
- 状态：设定图仍为视觉基线；运行时背景已切换为 4 张完整 16:9 背景图
- 设定图：`public/concepts/game-setting-board-2026-04-25.png`
- 当前背景底图：`public/home_bg.png`、`public/team_bg.png`、`public/battle_bg.png`、`public/score_bg.png`
- 历史背景底图：`public/backgroup.png` / `public/background-assets/`，仅作为旧尝试留档
- 前景素材：`public/imageSheet1.png`
- 当前规格：`docs/superpowers/specs/2026-04-25-setting-board-resource-contract.md`
- 当前编排计划：`docs/superpowers/plans/2026-04-25-setting-board-resource-adaptation-orchestration.md`

## 1. 用途定位

这张设定图不是一次性宣传图。2026-04-25 的最新要求已经把它提升为运行时视觉对齐源。随后新增的 4 张背景图是当前落地用资源：`home_bg.png` 负责大厅，`team_bg.png` 负责战前编队，`battle_bg.png` 负责上战场加下方答案选择区，`score_bg.png` 负责结算战报。`imageSheet1.png` 继续负责 logo、基地、炮塔、按钮、数字弹、技能、战报组件等前景素材。

它在后续迭代里的职责是：

1. 统一 `小小数学战场` 的第一眼游戏气质
2. 把大厅、房间、战斗、HUD、结算和核心资产放进同一套视觉语言
3. 作为下一阶段 UI / Phaser / 结算战报改造的对齐锚点
4. 防止后续页面继续退回普通网页表单、信息卡和报表式结算

## 1.1 当前运行时资源基线

- `public/home_bg.png`：首页大厅完整背景，尺寸 `1672x941`
- `public/team_bg.png`：战前编队室完整背景，尺寸 `1672x941`
- `public/battle_bg.png`：战斗场 + 下方答题控制台一体背景，尺寸 `1672x941`
- `public/score_bg.png`：胜利战报完整背景，尺寸 `1672x941`
- `public/imageSheet1.png`：元素图，尺寸 `1308x1203`

后续实现应把这些资源登记到 `public/game-assets/` 和 `src/lib/game/assets/asset-manifest.ts`。旧 `public/background-assets/` 与 `public/sheet-assets/` 可以暂留兼容，但不再作为新实现的主入口。

## 2. 设定图拆解

### 2.1 游戏大厅

目标感受：

- 打开即进入玩具战场式大厅
- 红蓝基地和中轴冲突先于表单出现
- `创建游戏` / `加入游戏` 是开局动作，不是普通页面按钮

后续落地重点：

- 用 `home_bg.png` 作为主视觉，不再使用 `backgroup.png` 切片
- 首页主视觉应让红蓝对峙成为第一信号
- 昵称、房间容量和房间码输入应收进开局面板或弹窗
- 本地 Demo 提示只保留轻提示，不长期占据主视觉

### 2.2 战前编队室

目标感受：

- 房间页像战前准备室，而不是等待列表
- 红蓝阵营、玩家槽位、房主开战和 ready 氛围同时可见
- 玩家进入房间后能直观看到自己站在哪边、还缺谁、是否能开战

后续落地重点：

- 用 `team_bg.png` 作为主视觉
- 用阵营平台和槽位替代普通成员列表感
- 加入队伍、换边、等待房主开始都要有状态反馈
- 房间码和邀请能力保留，但降到辅助层

### 2.3 主战场与答题控制台

目标感受：

- 战斗页第一主角是战场，不是题目表单
- 红蓝炮塔、基地、数字弹道和受击反馈共同表达“答题即攻击”
- 下半区是数字装填控制台，不是大题卡
- 即使不读文字，也能看懂谁攻击、谁掉血、谁占优

后续落地重点：

- 用 `battle_bg.png` 作为 battle 整页主视觉
- Phaser 只负责上半战场动态层：投射物、命中、护盾、伤害、血量状态
- DOM 只覆盖下半答题安全区：题目、答案槽、数字键、发射按钮
- 单数字题和余数题都改成数字选择；余数题保留 `商槽 + 余数槽`
- 不再叠加旧 `control-bg.png` 或普通表单卡片

### 2.4 胜利战报

目标感受：

- 结算页不是报表，而是一局打完后的战报
- 胜负情绪、关键一击、MVP 和再来一局形成闭环
- 玩家看完后有明确的复局冲动

后续落地重点：

- 用 `score_bg.png` 作为主视觉
- 以胜方旗帜和 MVP 为主视觉
- 统计卡只保留核心战斗信息
- 时间线从普通列表升级为关键战斗事件

### 2.5 资产设定

目标感受：

- 红方、蓝方、炮塔、数字弹、护盾、连击火花属于同一套系统
- 阵营差异主要靠结构和轮廓，不只靠换颜色
- 后续可继续拆出运行时素材

后续落地重点：

- 当前运行时优先使用 `public/game-assets/` 和 manifest，旧 `public/battle-assets/`、`public/background-assets/`、`public/sheet-assets/` 仅作为历史候补资源
- 先补 UI / Phaser 可感知效果，再考虑大批量生成新资产
- 不引入新角色系统，避免当前核心物件语言被稀释

## 3. 生成 Prompt 记录

```text
Create a polished game concept art sheet for a mobile vertical browser game called "小小数学战场". Show a cohesive set of 6 setting/design panels in one high-resolution image, arranged as a clean concept board with small Chinese labels integrated visually: 1) 游戏大厅 / battle-themed home screen: warm toy battlefield arena, red and blue bases facing each other, inviting but competitive; 2) 战前编队室 / room prep: two camp platforms, player slots, ready flags, team banners; 3) 主战场 / vertical battle stage: red and blue math turrets firing glowing number arrows across a compact arena; 4) 答题控制台 / combat HUD: lower control deck with large math question ammo card, answer slots, fire button, timer and damage chips; 5) 胜利战报 / result screen: winner banner, MVP medal, damage stats, key-hit timeline; 6) 资源设定 / asset callouts: red base, blue base, turret, number projectile, shield, combo spark. Style: colorful premium casual game, toy-like tactical battlefield, readable mobile UI proportions, soft 3D-isometric illustration mixed with clean UI mockup, warm sand ground plus sky blue, red/blue team contrast, gold reward accents, playful but not childish, no generic SaaS cards, no dark gritty style. Make the designs feel immediately like a game, with clear player goal, action, feedback, progression, and replay motivation. Include Chinese text only where labels are needed; avoid long paragraphs. High detail, production concept art, clean composition, 16:9 concept board.
```

## 4. 使用规则

- 后续改首页、房间、battle、HUD、结算时，先检查是否仍符合这张设定图的六面板方向
- 如果为了工程效率做局部降级，必须保留“红蓝对峙、战斗控制台、战报化结算”三个核心信号
- 当前 4 张背景图是完整 16:9 运行时背景，不允许再裁成局部背景
- 竖屏适配应采用 `contain-first` 或单独竖版派生图，不能直接 `cover` 裁掉主体
- 若后续出现新的设定图，本文件保留为 2026-04-25 版本基线
