# little-net-game

## Local development

### 零配置本地 Demo 模式

1. 只启动 Next.js：`npm run dev`
2. 打开 [http://localhost:3000](http://localhost:3000)
3. 不配置任何 Supabase / coordinator 环境变量时，首页会自动进入本地 Demo 模式
4. 可以直接用多个浏览器 tab 验证：
   大厅 -> 房间 -> 对战 -> 结算 -> 再来一局

说明：

- 本地 Demo 模式基于浏览器 `localStorage + sessionStorage`。
- 不同 tab 会有独立玩家身份，适合做界面效果和主流程调试。
- 这是 UI/交互验证模式，不是最终真实联机环境。

### 真实联机集成模式

1. 复制前端环境文件：`cp .env.example .env.local`
2. 在 `.env.local` 中填写：
   `NEXT_PUBLIC_SUPABASE_URL`
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   `COORDINATOR_BASE_URL`
   `COORDINATOR_SHARED_SECRET`
3. 复制 worker 环境文件：`cp realtime-worker/.dev.vars.example realtime-worker/.dev.vars`
4. 在 `realtime-worker/.dev.vars` 中填写：
   `COORDINATOR_SHARED_SECRET`
   `SUPABASE_URL`
   `SUPABASE_SERVICE_ROLE_KEY`
5. 确保 Supabase 已开启 Anonymous Sign-Ins。
6. 启动 Next.js：`npm run dev`
7. 启动 Cloudflare coordinator：`npm run dev:worker`
8. 在浏览器打开 [http://localhost:3000](http://localhost:3000)，完成大厅 -> 房间 -> 对战 -> 结算 -> 再来一局验证

### 本地验证说明

- 当前仓库支持两套本地验证方式：
  - 无环境变量：自动进入本地 Demo 模式
  - 有完整环境变量：进入真实联机集成模式
- 真实联机模式当前以 `Cloudflare Durable Objects coordinator` 为权威实时层，
  常规同步已经切到 `event-first, snapshot-on-demand`：
  - 常规房间/对局变化走 websocket 协议事件
  - 新连接、重连、显式同步请求才补 `room.snapshot` / `match.snapshot`
  - battle / room 页面不再依赖定时 `match.tick` 或高频页面轮询来推进真实在线状态
  - 若生产 `COORDINATOR_BASE_URL` 仍为 `*.workers.dev`，前端会自动切到主站同域
    `/api/coordinator-bridge/*`，由 Vercel 服务端代签名并代调 coordinator，
    避免国内客户端直连 `workers.dev` 握手超时
- 自动化本地验证使用：
  - `npm run test:all`
  - `npm run lint`
  - `npm run build`

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `COORDINATOR_BASE_URL`
- `COORDINATOR_SHARED_SECRET`
- `SUPABASE_URL` (worker)
- `SUPABASE_SERVICE_ROLE_KEY` (worker)

## Verification

- `npm run test:legacy`
- `npm run test:smoke-lib`
- `npm run test:unit`
- `npm run test:worker`
- `npm run lint`
- `npm run build`

## CI/CD automation

本仓库支持在 `push main` 后自动完成这条链路：

1. GitHub Actions 先跑 `lint + test`
2. 自动部署 Cloudflare coordinator worker
3. 等待生产域名升级后，跑一轮真实在线 smoke test：
   开房 -> 第二名玩家加入 -> 房主可开战 -> 双端进入 battle

工作流文件：

- [deploy-realtime-stack.yml](.github/workflows/deploy-realtime-stack.yml)

需要提前在 GitHub 仓库里配置的 Actions secret / variable：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `PRODUCTION_BASE_URL`（可选，不配时默认 `https://math.pigou.top`）

注意：

- workflow 只自动部署 `realtime-worker` 的代码，不会自动修改 Cloudflare 里已存在的运行时 secrets。
- `COORDINATOR_SHARED_SECRET`、`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 仍然需要先在 Cloudflare worker 侧配置完成。
- Vercel 仍然依赖现有 Git integration 自动部署，workflow 的 smoke test 会等待生产域名升级后再验通，而不是重复发起一份 Vercel 部署。
- 生产发布前如果 `COORDINATOR_BASE_URL` 指向 `*.workers.dev`，必须确认主站 bridge 已随当前版本一起上线；
  否则浏览器仍可能在房间页 / 对战页直接卡在 coordinator 握手阶段。
