# Game Core Release Checklist

- [x] `npm run test:legacy`
- [x] `npm run test:unit`
- [x] `npm run test:worker`
- [x] `npm run lint`
- [x] `npm run build`
- [ ] 双设备竖屏联机验证：大厅 -> 房间 -> 对战 -> 结算 -> 再来一局
- [ ] 弱网断线重连验证：房间页、战斗页各 1 次
- [ ] Cloudflare coordinator logs 无未处理异常
- [ ] Supabase `match_reports` 正常写入
