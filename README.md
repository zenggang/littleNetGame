# little-net-game

## Local development

1. 启动 Next.js：`npm run dev`
2. 启动 Cloudflare coordinator：`npm run dev:worker`
3. 在浏览器打开大厅，完成创建房间、加入房间、开始对战验证

## Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `COORDINATOR_BASE_URL`
- `COORDINATOR_SHARED_SECRET`

## Verification

- `npm run test:legacy`
- `npm run test:unit`
- `npm run test:worker`
- `npm run lint`
- `npm run build`
