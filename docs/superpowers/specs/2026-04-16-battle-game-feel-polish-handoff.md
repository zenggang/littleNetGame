# Battle 游戏感增强接力 Prompt

以下 prompt 用于在新会话中继续当前三段式开发，避免重复探索和重复消耗 token。

---

## 推荐 Prompt

继续 littleNetGame 项目的 battle 游戏感增强任务。

这是基于现有三段式流程继续执行，不是新任务，也不是重新 brainstorming。

你必须先读取并严格基于以下文档继续：

1. 主设计文档  
`docs/superpowers/specs/2026-04-16-pure-game-core-rebuild-design.md`

2. 主实施计划  
`docs/superpowers/plans/2026-04-16-pure-game-core-rebuild-implementation.md`

3. Battle 游戏感增强规格  
`docs/superpowers/specs/2026-04-16-battle-game-feel-polish-design.md`

4. 验证清单  
`docs/verification/game-core-release-checklist.md`

5. 当前真实代码  
以 `main` 当前工作区真实代码为准，不要凭想象推断

当前项目状态说明：

- 主重构大阶段仍以 2026-04-16 的主设计/主实施计划为准
- 大厅、房间准备室、battle 主链路、协调层接管、结果页、M4 自动化验证都已基本完成
- 另外已经实现了“无 Supabase 环境时自动进入本地 Demo 模式”
- 本地 Demo 模式支持通过多个 tab 验证大厅、房间、对战、结果页
- battle 页当前仍存在游戏感不足的问题，因此又锁定了专门的 battle 强化规格

你当前所处的三段式阶段：

- 第 1 段探索：已完成
- 第 2 段规格锁定：已完成
- 你现在必须从第 3 段执行开始，不要重新做大范围探索

当前 battle 强化任务的已锁定方向：

- 方向不是轻量修样式，而是“方案 B：混合重构”
- 目标是把 battle 页提升为“儿童向夸张演出感”的竖屏对战界面
- 必须解决：
  - 不像游戏
  - 输入框过大
  - 战斗区变形
  - 缺乏发箭、命中、掉血、超时等战斗演出
- 必须保证这些效果在本地 Demo 模式下也能验证

你接下来要做的事：

1. 先读取 battle 强化规格和当前 battle 相关代码
2. 输出 battle 强化实现计划
3. 计划应聚焦以下文件：
   - `src/app/battle/[matchId]/page.tsx`
   - `src/app/battle/[matchId]/page.module.css`
   - `src/components/battle-runtime/BattleHud.tsx`
   - `src/components/battle-runtime/PhaserBattleStage.tsx`
   - `src/components/battle-runtime/scenes/BattleScene.ts`
   - `src/components/battle-runtime/build-battle-view-model.ts`
   - `src/components/game/question-form.tsx`
4. 计划确认后，再进入代码实现
5. 实现时继续遵守：
   - 修改范围聚焦
   - 不偏离主重构方向
   - 不重新讨论大厅/房间页
   - 所有代码要有专业且详细的注释
   - 默认中文说明

不要重复做的事：

- 不要重新讨论 battle 是否需要增强游戏感
- 不要重新发散到全局产品设计
- 不要重新改主 spec
- 不要把任务扩展到新玩法/新学科/新系统

如果发现 battle 强化规格与当前代码存在冲突：

- 先指出冲突点
- 再给出最小修订建议
- 不要直接跳过规格自行发挥

目标：

从 battle 强化规格直接进入执行，减少重复探索，集中把 battle 页游戏感做出来。

---

## 当前已知事实（供新会话快速理解）

- `localhost:3000` 现在支持零配置本地 Demo 模式
- 无 Supabase 环境时，首页会显示本地 Demo 模式提示
- room/match session 已支持本地 fallback
- `npm run test:all`
- `npm run lint`
- `npm run build`
  当前均已通过

所以新会话的重点不是修基础联机链路，而是：

`执行 battle 游戏感增强规格。`
