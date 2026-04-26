# 设定图资源语义化适配多 Agent 编排

> **For agentic workers:** 本计划跟随 `docs/superpowers/specs/2026-04-25-setting-board-resource-contract.md`。共享资源契约未落地前，禁止并行改 UI 页面。不要继续执行旧计划 `2026-04-25-game-setting-driven-gamefeel-implementation.md`。

## 目标

把 `game-setting-board-2026-04-25.png` 的游戏界面规范落到运行时，并把最新 4 张完整背景图与 `imageSheet1.png` 从“散图素材”升级成语义化资源系统。

最新资源基线：

- `public/home_bg.png`：大厅背景
- `public/team_bg.png`：房间 / 战前编队背景
- `public/battle_bg.png`：战斗场 + 下方答题控制台一体背景
- `public/score_bg.png`：结算战报背景
- `public/imageSheet1.png`：UI、单位、FX、战报元素图

`public/backgroup.png` 已退为历史源图，不再做背景切片。

## 编排原则

- OpenSpec 策略：`required`
- 当前阶段必须先锁资源契约，再实现页面
- 默认先并行探索/资源处理，后串行集成高冲突样式
- `globals.css`、`src/app/battle/[matchId]/page.tsx`、`src/app/battle/[matchId]/page.module.css`、`BattleScene.ts`、`battle-stage-assets.ts` 禁止多人并行写
- 每个实现子任务必须交付本地验证状态和截图验收入口

## 子任务 1：资源 Manifest 与元素切片

- 任务类型：实现
- OpenSpec 策略：required，已由资源契约规格覆盖
- 目标：
  - 复制或登记 `home_bg.png`、`team_bg.png`、`battle_bg.png`、`score_bg.png` 为完整背景资产
  - 从 `public/imageSheet1.png` 切出首批必用 `ui / units / fx` 资源
  - 建立 manifest，记录 key、路径、来源源图、坐标、尺寸、用途、缩放规则、安全区和运行层
- 写入边界：
  - `public/game-assets/`
  - `src/lib/game/assets/`
  - 资产 manifest 测试
- 禁止：
  - 修改页面组件
  - 修改 `globals.css`
  - 重新切 4 张 `*_bg.png` 背景图
  - 直接把带棋盘底的前景资源交付为完成
- 完成标准：
  - `public/game-assets/scenes|ui|units|fx` 目录存在
  - manifest 覆盖 4 张背景和规格中的首批必用 key
  - `imageSheet1.png` 已确认没有 alpha 通道，前景资源必须完成去底且肉眼无棋盘底
  - 资产测试通过

## 子任务 2：大厅与开局面板适配

- 任务类型：实现
- OpenSpec 策略：required
- 目标：
  - 大厅首屏以 `scene.home.main` 为主视觉
  - 创建/加入面板使用资源按钮和游戏面板语义
- 写入边界：
  - `src/components/game-shell/GameHallScreen.tsx`
  - `src/components/game-shell/GameEntryModal.tsx`
  - 对应测试
  - 若必须改全局样式，只能在主 agent 允许后改 `globals.css` 的大厅段落
- 依赖：
  - 子任务 1 的 `scene.home.main`、logo、按钮、红蓝主基地/士兵资源
- 完成标准：
  - 截图中可见完整大厅背景、logo、红蓝实体、开始对战、创建/加入
  - 指挥官输入降级，不抢主视觉
  - create/join 行为不变

## 子任务 3：战前编队室适配

- 任务类型：实现
- OpenSpec 策略：required
- 目标：
  - 房间页以 `scene.team.prepare` 为主视觉
  - 玩家槽、ready、VS、房主开战成为主画面
- 写入边界：
  - `src/components/game-shell/RoomPrepScreen.tsx`
  - `src/app/room/[code]/page.tsx`
  - 对应测试
  - 样式改动必须与大厅错开，避免 `globals.css` 冲突
- 依赖：
  - 子任务 1 的 `scene.team.prepare`、红蓝旗台、VS、按钮资源
- 完成标准：
  - 截图接近设定图第 2 格和 `team_bg.png`
  - 玩家状态挂在阵营区域内
  - 未满员不可开战状态清楚

## 子任务 4：Battle 页面分层适配

- 任务类型：实现
- OpenSpec 策略：required
- 目标：
  - Battle 页面以 `scene.battle.play` 作为整页游戏背景
  - 页面结构从“四段网页布局”改成“上半 Phaser 动态战场 + 下半 DOM 数字装填区”
  - 定义上半战场安全区和下半答题安全区
- 写入边界：
  - `src/app/battle/[matchId]/page.tsx`
  - `src/app/battle/[matchId]/page.module.css`
  - 必要的 battle 页面测试
- 禁止：
  - 与子任务 5 或子任务 6 同时改 battle 文件
  - 用新的 DOM 大卡片盖住 `battle_bg.png` 下半控制台
- 完成标准：
  - 移动端竖屏和桌面截图均能看到完整 `battle_bg.png` 主体
  - Phaser 上半区非空，下半区 DOM 可交互

## 子任务 5：Phaser 动态战场适配

- 任务类型：实现
- OpenSpec 策略：required
- 目标：
  - Phaser 只覆盖 `scene.battle.play` 的上半战场安全区
  - 用 manifest key 加载动态箭矢、护盾、伤害、士兵/炮口反馈
  - 删除或关闭与 `battle_bg.png` 重复的静态道路、基地、炮塔底图
- 写入边界：
  - `src/components/battle-runtime/scenes/BattleScene.ts`
  - `src/components/battle-runtime/scenes/battle-stage-assets.ts`
  - `src/components/battle-runtime/PhaserBattleStage.tsx`
  - scene / asset 测试
- 禁止：
  - 与子任务 4 同时改 battle 页面结构
  - 用 Phaser graphics 代替设定图已有的核心资源
- 完成标准：
  - 战场截图红左蓝右、中轴路线清楚
  - 正确命中能看到资源化箭矢/伤害/护盾反馈
  - 背景基地不重复发虚

## 子任务 6：Battle 答题控制台与余数题数字选择

- 任务类型：实现
- OpenSpec 策略：required
- 目标：
  - 下半区从表单改成贴合 `battle_bg.png` 的数字装填控制台
  - 单数字题和余数题都使用数字选择模式
  - 余数题保留 `{ quotient, remainder }` 双字段真值
- 写入边界：
  - `src/components/battle-runtime/BattleHud.tsx`
  - `src/components/game/question-form.tsx`
  - `src/components/battle-runtime/build-battle-view-model.ts`
  - 相关测试
  - 控制台样式段落
- 依赖：
  - 子任务 1 的答案槽、数字键、发射按钮、技能资源
  - 子任务 4 的 battle 下半安全区
- 完成标准：
  - 截图一眼像控制台，不像网页输入表单
  - 单答案题优先表现为答案槽/数字按钮
  - 余数题表现为 `商槽 + 余数槽 + 0-9 数字键`
  - 提交 payload 仍为 `{ value }` 或 `{ quotient, remainder }`

## 子任务 7：结果战报适配

- 任务类型：实现
- OpenSpec 策略：required
- 目标：
  - 结果页以 `scene.score.report` 为主视觉
  - 胜利 banner、MVP、数据对比、关键命中时间轴、再来一局成为主层级
- 写入边界：
  - `src/app/result/[matchId]/page.tsx`
  - `src/app/result/[matchId]/page.module.css`
  - `src/lib/game/result/match-report.ts`
  - 对应测试
- 依赖：
  - 子任务 1 的 `scene.score.report`、MVP、面板、按钮资源
- 完成标准：
  - 截图接近设定图第 5 格和 `score_bg.png`
  - cached report fallback 不变
  - `再来一局` 是最强动作

## 子任务 8：集成验证与文档回填

- 任务类型：验证 / 汇总
- OpenSpec 策略：forbidden，直接按规格验收
- 目标：
  - 按设定图和 4 张最新背景逐张截图验收
  - 跑自动门禁
  - 回填 current-state 和 release checklist
- 写入边界：
  - `docs/superpowers/specs/2026-04-20-game-core-current-state-and-next-milestones.md`
  - `docs/verification/game-core-release-checklist.md`
  - 必要时更新 README
- 验证标准：
  - `npm run test:all`
  - `npm run lint`
  - `npm run build`
  - in-app browser 或等价浏览器截图：大厅、创建/加入、房间、battle active、余数题数字选择、result

## 并行策略

1. 可并行：
   - 子任务 1 的资源 manifest 与元素切片
   - 子任务 8 的验证脚本/截图标准准备
2. 子任务 2/3/6 都可能碰 `globals.css`，默认串行。
3. 子任务 4 必须先于子任务 5/6 完成 battle 安全区定义。
4. 子任务 5 独占 Phaser runtime，不与任何 battle 页面结构改动并行。
5. 子任务 7 可在子任务 1 完成战报资源后并行，但不得改共享全局样式。
6. 所有子任务完成后由主 agent 统一整合样式冲突、跑全量验证。

## 阻塞上报规则

- 背景没有铺满屏幕：立即上报，不允许退回网页卡片或外层渐变留白。
- 背景主体被遮挡：立即上报，不允许通过大白卡覆盖关键阵营、控制台或战报主体。
- 资源去底失败：立即上报，不允许用带棋盘底资源糊弄。
- 某个必用资源无法可靠切出：manifest 标记 `blocked` 并说明替代方案。
- 余数题仍出现文本输入框：任务不算完成。
- 浏览器截图不像设定图或最新背景图：任务不算完成，即使测试通过。
