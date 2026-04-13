"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getMatchSnapshot,
  restartRoom,
  subscribeToMatch,
  toUserMessage,
} from "@/lib/supabase/game-store";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function ResultPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const matchId = String(params.matchId ?? "");
  const hydrated = useHydrated();
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getMatchSnapshot>> | null>(null);
  const [error, setError] = useState("");

  const loadSnapshot = useCallback(async () => {
    try {
      const nextSnapshot = await getMatchSnapshot(matchId);
      setSnapshot(nextSnapshot);
      setError("");
    } catch (nextError) {
      setError(toUserMessage(nextError));
    }
  }, [matchId]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      void loadSnapshot();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, loadSnapshot]);

  useEffect(() => {
    const roomId = snapshot?.room?.id;
    const activeMatchId = snapshot?.match?.id;

    if (!hydrated || !roomId || !activeMatchId) {
      return;
    }

    return subscribeToMatch(roomId, activeMatchId, () => {
      loadSnapshot();
    });
  }, [hydrated, loadSnapshot, snapshot?.match?.id, snapshot?.room?.id]);

  if (!hydrated || !snapshot) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>结算加载中</h1>
        </section>
      </main>
    );
  }

  if (!snapshot.match || !snapshot.room) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>{error || "结算找不到了"}</h1>
          <button className="primaryButton" onClick={() => router.push("/")} type="button">
            返回大厅
          </button>
        </section>
      </main>
    );
  }

  const room = snapshot.room;
  const match = snapshot.match;
  const winnerLabel = match.winner === "red" ? "红队胜利" : "蓝队胜利";

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>Winner</p>
        <h1>{winnerLabel}</h1>
        <p className={styles.summary}>
          {match.winReason === "hp_zero"
            ? "有一方血量归零，战斗提前结束。"
            : "60 秒结束后，胜负已经判定。"}
        </p>

        <div className={styles.scoreGrid}>
          <article className={styles.scoreCard}>
            <strong>红队血量</strong>
            <span>{match.teams.red.hpCurrent}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>蓝队血量</strong>
            <span>{match.teams.blue.hpCurrent}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>红队答对</strong>
            <span>{match.totalCorrect.red}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>蓝队答对</strong>
            <span>{match.totalCorrect.blue}</span>
          </article>
        </div>

        <div className={styles.actions}>
          <button
            className="primaryButton"
            onClick={async () => {
              try {
                await restartRoom(room.code);
                router.push(`/room/${room.code}`);
              } catch (nextError) {
                setError(toUserMessage(nextError));
              }
            }}
            type="button"
          >
            再来一局
          </button>
          <button className="ghostButton" onClick={() => router.push("/")} type="button">
            返回大厅
          </button>
        </div>
      </section>
    </main>
  );
}
