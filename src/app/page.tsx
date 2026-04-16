"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GameHallScreen } from "@/components/game-shell/GameHallScreen";
import {
  createRoom,
  joinRoom,
  readPlayerSession,
  toUserMessage,
} from "@/lib/supabase/game-store";
import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const isLocalDemoMode = !hasSupabaseEnvConfigured();
  const [capacity, setCapacity] = useState<2 | 3 | 4 | 6>(2);
  const [message, setMessage] = useState("");
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    readPlayerSession()
      .then((session) => {
        if (!cancelled && session?.nickname) {
          setNickname((current) => current || session.nickname);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <GameHallScreen
        capacity={capacity}
        message={
          message ||
          (isLocalDemoMode
            ? "当前为本地 Demo 模式：可直接用多个 tab 验证大厅、房间、对战和结果页效果。"
            : "")
        }
        nickname={nickname}
        onCreate={async () => {
          try {
            // 保留旧首页的提交流程：请求期间锁定入口，并把失败文案直接回显到当前弹窗。
            setSubmitting(true);
            setMessage("");
            const room = await createRoom({ capacity, nickname });
            router.push(`/room/${room.code}`);
          } catch (error) {
            setMessage(toUserMessage(error));
          } finally {
            setSubmitting(false);
          }
        }}
        onJoin={async () => {
          try {
            setSubmitting(true);
            setMessage("");
            const normalizedRoomCode = roomCode.trim();
            await joinRoom({ roomCode: normalizedRoomCode, nickname });
            router.push(`/room/${normalizedRoomCode}`);
          } catch (error) {
            setMessage(toUserMessage(error));
          } finally {
            setSubmitting(false);
          }
        }}
        onCapacityChange={setCapacity}
        onNicknameChange={setNickname}
        onRoomCodeChange={setRoomCode}
        roomCode={roomCode}
        submitting={submitting}
      />
    </main>
  );
}
