"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { GameHallScreen } from "@/components/game-shell/GameHallScreen";
import {
  createRoom,
  joinRoom,
  readPlayerSession,
} from "@/lib/supabase/game-store";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");

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
        nickname={nickname}
        onCreate={async () => {
          const room = await createRoom({ capacity: 2, nickname });
          router.push(`/room/${room.code}`);
        }}
        onJoin={async () => {
          const normalizedRoomCode = roomCode.trim();
          await joinRoom({ roomCode: normalizedRoomCode, nickname });
          router.push(`/room/${normalizedRoomCode}`);
        }}
        onNicknameChange={setNickname}
        onRoomCodeChange={setRoomCode}
        roomCode={roomCode}
      />
    </main>
  );
}
