"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { getMatchSnapshot, restartRoom, subscribeToDemoStore } from "@/lib/demo/store";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function ResultPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const matchId = String(params.matchId ?? "");
  const hydrated = useHydrated();
  const [, setRefreshTick] = useState(0);

  useEffect(
    () => subscribeToDemoStore(() => setRefreshTick((value) => value + 1)),
    [],
  );

  const snapshot = getMatchSnapshot(matchId);

  if (!hydrated) {
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
          <h1>结算找不到了</h1>
          <button className="primaryButton" onClick={() => router.push("/")} type="button">
            返回大厅
          </button>
        </section>
      </main>
    );
  }

  const winnerLabel = snapshot.match.winner === "red" ? "红队胜利" : "蓝队胜利";

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>Winner</p>
        <h1>{winnerLabel}</h1>
        <p className={styles.summary}>
          {snapshot.match.winReason === "hp_zero"
            ? "有一方血量归零，战斗提前结束。"
            : "60 秒结束后，胜负已经判定。"}
        </p>

        <div className={styles.scoreGrid}>
          <article className={styles.scoreCard}>
            <strong>红队血量</strong>
            <span>{snapshot.match.teams.red.hpCurrent}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>蓝队血量</strong>
            <span>{snapshot.match.teams.blue.hpCurrent}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>红队答对</strong>
            <span>{snapshot.match.totalCorrect.red}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>蓝队答对</strong>
            <span>{snapshot.match.totalCorrect.blue}</span>
          </article>
        </div>

        <div className={styles.actions}>
          <button
            className="primaryButton"
            onClick={() => {
              restartRoom(snapshot.room!.code);
              router.push(`/room/${snapshot.room!.code}`);
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
