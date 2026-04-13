type ModeCalloutProps = {
  isSupabaseReady: boolean;
};

export function ModeCallout({ isSupabaseReady }: ModeCalloutProps) {
  return (
    <div className="modeCallout">
      <strong>{isSupabaseReady ? "Supabase 已就绪" : "本地多标签演示模式"}</strong>
      <span>
        {isSupabaseReady
          ? "配置好匿名登录和表结构后，这里可以切到真正的房间同步。"
          : "当前未检测到 Supabase 环境变量。先用多个浏览器标签页体验完整闭环。"}
      </span>
    </div>
  );
}
