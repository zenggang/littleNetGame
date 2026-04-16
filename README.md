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
- `npm run test:unit`
- `npm run test:worker`
- `npm run lint`
- `npm run build`
