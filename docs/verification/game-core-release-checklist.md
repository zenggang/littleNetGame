# Game Core Release Checklist

- [x] `npm run test:legacy`
- [x] `npm run test:unit`
- [x] `npm run test:worker`
- [ ] `npm run lint`（当前会被 `.worktrees/.../.next` 生成产物拖失败，需要补 ignore 或清理工作树）
- [x] `npm run build`
- [x] 核心主链路已跑通：大厅 -> 房间 -> 对战 -> 结算 -> 再来一局
- [x] Local Demo 模式已可验证主流程
- [ ] 双设备竖屏联机验证：大厅 -> 房间 -> 对战 -> 结算 -> 再来一局
- [ ] 弱网断线重连验证：房间页、战斗页各 1 次
- [ ] Cloudflare coordinator logs 无未处理异常
- [ ] Supabase `match_reports` migration 已在目标环境落地并正常写入
- [ ] 结果页在刷新 / 新标签打开场景下仍显示可信终局数据
