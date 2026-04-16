"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getMatchReport,
  getMatchSnapshot,
  restartRoom,
  toUserMessage,
} from "@/lib/supabase/game-store";
import { buildMatchReport } from "@/lib/game/result/match-report";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type ResultReport = ReturnType<typeof buildMatchReport> & {
  roomCode: string;
};

export default function ResultPage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const matchId = String(params.matchId ?? "");
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  const [report, setReport] = useState<ResultReport | null>(null);

  const loadReport = useCallback(async () => {
    try {
      const reportRow = await getMatchReport(matchId);

      setReport({
        ...buildMatchReport({
          winner: reportRow.winner_team,
          winReason: reportRow.win_reason,
          teams: {
            red: { hpCurrent: reportRow.final_hp.red },
            blue: { hpCurrent: reportRow.final_hp.blue },
          },
          totalCorrect: reportRow.total_correct,
          durationMs: reportRow.duration_ms,
        }),
        roomCode: reportRow.room_code,
      });
      setError("");
    } catch {
      try {
        const snapshot = await getMatchSnapshot(matchId);

        if (!snapshot.match || !snapshot.room) {
          throw new Error("结算找不到了");
        }

        setReport({
          ...buildMatchReport({
            winner: snapshot.match.winner ?? "red",
            winReason: snapshot.match.winReason ?? "time_up",
            teams: {
              red: { hpCurrent: snapshot.match.teams.red.hpCurrent },
              blue: { hpCurrent: snapshot.match.teams.blue.hpCurrent },
            },
            totalCorrect: snapshot.match.totalCorrect,
            durationMs:
              Date.parse(snapshot.match.endedAt ?? snapshot.match.endsAt) -
              Date.parse(snapshot.match.createdAt),
          }),
          roomCode: snapshot.room.code,
        });
        setError("");
      } catch (nextError) {
        setReport(null);
        setError(toUserMessage(nextError));
      }
    }
  }, [matchId]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      void loadReport();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hydrated, loadReport]);

  if (!hydrated || !report) {
    return (
      <main className={styles.page}>
        <section className={styles.card}>
          <h1>{error || "结算加载中"}</h1>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>Winner</p>
        <h1>{report.headline}</h1>
        <p className={styles.summary}>{report.summary}</p>

        <div className={styles.scoreGrid}>
          <article className={styles.scoreCard}>
            <strong>红队血量</strong>
            <span>{report.stats.redHp}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>蓝队血量</strong>
            <span>{report.stats.blueHp}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>红队答对</strong>
            <span>{report.stats.redCorrect}</span>
          </article>
          <article className={styles.scoreCard}>
            <strong>蓝队答对</strong>
            <span>{report.stats.blueCorrect}</span>
          </article>
        </div>

        <div className={styles.actions}>
          <button
            className="primaryButton"
            onClick={async () => {
              try {
                await restartRoom(report.roomCode);
                router.push(`/room/${report.roomCode}`);
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

        {error ? <p className={styles.summary}>{error}</p> : null}
      </section>
    </main>
  );
}
