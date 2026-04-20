# Game Core Release Checklist

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
- [ ] 双设备竖屏联机验证：大厅 -> 房间 -> 对战 -> 结算 -> 再来一局
- [ ] 弱网断线重连验证：房间页、战斗页各 1 次
- [ ] Cloudflare coordinator logs 无未处理异常
- [ ] Supabase `match_reports` 正常写入
