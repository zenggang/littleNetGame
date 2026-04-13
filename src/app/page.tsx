"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ModeCallout } from "@/components/game/mode-callout";
import { createRoom, joinRoom, readPlayerSession } from "@/lib/demo/store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const session = useMemo(() => readPlayerSession(), []);
  const [nickname, setNickname] = useState(session?.nickname ?? "");
  const [capacity, setCapacity] = useState<2 | 3 | 4 | 6>(2);
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState("");

  return (
    <main className={styles.page}>
      <section className={styles.heroCard}>
        <p className={styles.kicker}>答题越快越准，箭雨就越猛</p>
        <h1>小小数学战场</h1>
        <p className={styles.summary}>
          上方打仗，下方答题。全房同题，谁先答对，谁的阵营立刻发箭。
        </p>

        <ModeCallout isSupabaseReady={hasSupabaseEnv} />

        <div className={styles.formBlock}>
          <label>
            你的昵称
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className={styles.input}
              placeholder="输入一个短昵称"
            />
          </label>
        </div>

        <div className={styles.actions}>
          <section className={styles.createCard}>
            <h2>创建房间</h2>
            <p>当前只支持小学二年级，容量决定支持的对战模式。</p>

            <div className={styles.capacityGrid}>
              {[2, 3, 4, 6].map((value) => (
                <button
                  key={value}
                  className={`${styles.capacityButton} ${capacity === value ? styles.active : ""}`}
                  onClick={() => setCapacity(value as 2 | 3 | 4 | 6)}
                  type="button"
                >
                  {value} 人房
                </button>
              ))}
            </div>

            <button
              className={styles.primaryButton}
              onClick={() => {
                const room = createRoom({ capacity, nickname });
                router.push(`/room/${room.code}`);
              }}
              type="button"
            >
              创建并进入房间
            </button>
          </section>

          <section className={styles.joinCard}>
            <h2>加入房间</h2>
            <p>把房间码告诉同学，或输入别人的房间码加入。</p>

            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              className={styles.input}
              placeholder="输入 4 位房间码"
            />

            <button
              className={styles.secondaryButton}
              onClick={() => {
                try {
                  joinRoom({ roomCode: roomCode.trim(), nickname });
                  router.push(`/room/${roomCode.trim()}`);
                } catch {
                  setMessage("没找到这个房间，或者房间已经开始了。");
                }
              }}
              type="button"
            >
              加入房间
            </button>
          </section>
        </div>

        <div className={styles.quickRules}>
          <article>
            <strong>支持模式</strong>
            <span>1v1、1v2、1v3、2v2、3v3</span>
          </article>
          <article>
            <strong>本局时长</strong>
            <span>60 秒快节奏对战</span>
          </article>
          <article>
            <strong>题型范围</strong>
            <span>加减乘除和有余数除法</span>
          </article>
        </div>

        {message ? <p className={styles.message}>{message}</p> : null}
      </section>
    </main>
  );
}
