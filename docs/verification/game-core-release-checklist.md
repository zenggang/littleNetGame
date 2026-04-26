# Game Core Release Checklist

## 核心联机发布门槛

- [x] `npm run test:legacy`
- [x] `npm run test:unit`
- [x] `npm run test:worker`
- [x] `npm run lint`
- [x] `npm run build`
- [x] coordinator 常规高频路径已改为 `event-first, snapshot-on-demand`
- [x] room / match 广播已拆开
- [x] battle 页不再依赖定时 `match.tick + loadSnapshot`
- [x] room 页不再依赖高频轮询快照
- [x] `seq gap -> sync.request -> snapshot resync` 最小恢复闭环已接通
- [x] 若 coordinator 生产公网入口仍为 `*.workers.dev`，客户端已改走主站同域 `/api/coordinator-bridge/*`
- [ ] 双设备竖屏联机验证：大厅 -> 房间 -> 对战 -> 结算 -> 再来一局
- [ ] 弱网断线重连验证：房间页、战斗页各 1 次
- [ ] Cloudflare coordinator logs 无未处理异常
- [ ] Supabase `match_reports` 正常写入
- [ ] 生产域名下 `/api/coordinator-ticket` 已返回 `mode=bridge`，且 room / battle 页能经主站 bridge 正常联机

## 2026-04-25 设定图驱动游戏感门槛

- [x] 设定图已保存：`public/concepts/game-setting-board-2026-04-25.png`
- [x] 最新完整背景图已保存：`public/home_bg.png`、`public/team_bg.png`、`public/battle_bg.png`、`public/score_bg.png`
- [x] 元素资源图已保存：`public/imageSheet1.png`
- [x] 设定图说明已更新：`docs/superpowers/assets/2026-04-25-little-net-game-setting-board.md`
- [x] 活跃规格已更新：`docs/superpowers/specs/2026-04-25-setting-board-resource-contract.md`
- [x] 多 agent 实施编排已更新：`docs/superpowers/plans/2026-04-25-setting-board-resource-adaptation-orchestration.md`
- [x] `public/game-assets/` 已建立，并登记 4 张完整背景图
- [x] `src/lib/game/assets/asset-manifest.ts` 已建立或更新，包含背景安全区、fit 策略、运行层和元素来源坐标
- [x] `imageSheet1.png` 首批必用元素已切出透明资源，无棋盘底；无法可靠透明导出的元素已在 manifest 标记为 `blocked`
- [x] 首页使用 `scene.home.main`，首屏截图符合大厅设定
- [x] 房间页使用 `scene.team.prepare`，截图符合战前编队设定
- [x] battle 使用 `scene.battle.play`，上半 Phaser 动态战场 + 下半 DOM 数字装填区已接入
- [x] 余数题已改为 `商槽 + 余数槽 + 数字键`，提交 payload 仍为 `{ quotient, remainder }`
- [x] 结算页使用 `scene.score.report`，截图符合胜利战报设定
- [x] 2026-04-26 修正：低清按钮资源已退出主运行按钮，首页 / 房间 / 结算主按钮改为同风格 CSS 高清按钮
- [x] 2026-04-26 修正：首页取消中间“开始对战”按钮，只保留创建 / 加入两个主入口
- [x] 2026-04-26 修正：battle 题面、答案选项、发射按钮压回下半控制台安全区，不再表现为悬浮表单
- [x] 2026-04-26 修正：结算页减少信息密度，默认只展示胜负、核心数据、胜因、MVP、关键一击和复局入口
- [ ] 正确 / 答错 / 超时 / 终局浏览器手动反馈验证
- [ ] 移动端竖屏截图回归：大厅、房间、battle、结算
- [x] 新资源契约落地后重新执行：`npm run test:all`
- [x] 新资源契约落地后重新执行：`npm run lint`
- [x] 新资源契约落地后重新执行：`npm run build`

> 旧记录 `public/backgroup.png -> public/background-assets/`、`public/imageSheet1.png -> public/sheet-assets/` 只能作为历史尝试，不再代表当前游戏化体验线完成。当前首轮落地仍保留两个后续验收点：战斗反馈逐态截图、移动端竖屏截图回归。
