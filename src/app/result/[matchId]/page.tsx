"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import {
  getMatchReport,
  getMatchSnapshot,
  toUserMessage,
} from "@/lib/supabase/game-store";
import { getAvailableGameAsset } from "@/lib/game/assets/asset-manifest";
import { readCachedMatchReport } from "@/lib/game/result/local-report-cache";
import { buildMatchReport } from "@/lib/game/result/match-report";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

type ResultReport = ReturnType<typeof buildMatchReport> & {
  roomCode: string;
};

// 结算页背景必须跟随资源 manifest，避免页面继续引用旧 result-bg 或绕过 scene.score.report 契约。
const SCORE_REPORT_SCENE = getAvailableGameAsset("scene.score.report");

type ScoreReportStyle = CSSProperties & {
  "--score-report-bg": string;
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
          finalEventLog: normalizeEventLog(reportRow.final_event_log),
        }),
        roomCode: reportRow.room_code,
      });
      setError("");
    } catch {
      const cachedReport = readCachedMatchReport(matchId);

      if (cachedReport) {
        setReport({
          ...buildMatchReport(cachedReport),
          roomCode: cachedReport.roomCode,
        });
        setError("");
        return;
      }

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
            finalEventLog: normalizeEventLog(snapshot.match.events),
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
      <main
        className={styles.page}
        data-scene-key={SCORE_REPORT_SCENE.key}
        style={{
          "--score-report-bg": `url("${SCORE_REPORT_SCENE.path}")`,
        } as ScoreReportStyle}
      >
        <section className={styles.card}>
          <h1>{error || "结算加载中"}</h1>
        </section>
      </main>
    );
  }

  return (
    <main
      className={styles.page}
      data-scene-key={SCORE_REPORT_SCENE.key}
      style={{
        "--score-report-bg": `url("${SCORE_REPORT_SCENE.path}")`,
      } as ScoreReportStyle}
    >
      <section className={styles.reportShell}>
        <div className={styles.hero}>
          <p className={styles.kicker}>Battle Report</p>
          <h1>{report.headline}</h1>
          <p className={styles.summary}>{report.summary}</p>
          <div className={styles.heroStats} aria-label="本局战报摘要">
            <span>{report.winReason.label}</span>
            <span>{report.stats.durationLabel}</span>
            <span>{report.roomCode}</span>
          </div>
        </div>

        <section className={styles.outcomeGrid} aria-label="胜负结果">
          <article className={`${styles.teamPanel} ${styles[report.winner.tone]}`}>
            <span className={styles.panelLabel}>胜方</span>
            <strong>{report.winner.label}</strong>
            <p>{report.winReason.text}</p>
          </article>
          <article className={`${styles.teamPanel} ${styles[report.loser.tone]}`}>
            <span className={styles.panelLabel}>败方</span>
            <strong>{report.loser.label}</strong>
            <p>复盘关键题目，下一局把节奏抢回来。</p>
          </article>
        </section>

        <section className={styles.keySummary} aria-label="关键战况">
          <article className={styles.featureCard}>
            <span className={styles.panelLabel}>胜因</span>
            <strong>{report.winReason.label}</strong>
            <p>{report.winReason.text}</p>
          </article>
          <article className={styles.featureCard}>
            <span className={styles.panelLabel}>MVP</span>
            <strong>{report.mvp.label}</strong>
            <p>{report.mvp.text}</p>
          </article>
          <article className={styles.featureCard}>
            <span className={styles.panelLabel}>关键一击</span>
            <strong>{report.keyHit?.label ?? "暂无命中"}</strong>
            <p>{report.keyHit?.text ?? "本局没有可派生的命中事件，胜负由血量与时间结算。"}</p>
            {report.keyHit ? <em>{report.keyHit.damage} 点伤害</em> : null}
          </article>
        </section>

        <section className={styles.scoreBoard} aria-label="战斗数据">
          <div>
            <span>红队血量</span>
            <strong>{report.stats.redHp}</strong>
          </div>
          <div>
            <span>蓝队血量</span>
            <strong>{report.stats.blueHp}</strong>
          </div>
          <div>
            <span>红队答对</span>
            <strong>{report.stats.redCorrect}</strong>
          </div>
          <div>
            <span>蓝队答对</span>
            <strong>{report.stats.blueCorrect}</strong>
          </div>
        </section>

        <div className={styles.actions} aria-label="结算操作">
          <button
            className={`${styles.rematchButton} gamePaintButton gamePaintButtonRed`}
            onClick={() => {
              router.push(`/room/${report.roomCode}`);
            }}
            type="button"
          >
            再来一局
          </button>
          <button className={styles.lobbyButton} onClick={() => router.push("/")} type="button">
            返回大厅
          </button>
        </div>

        {error ? <p className={styles.summary}>{error}</p> : null}
      </section>
    </main>
  );
}

function normalizeEventLog(value: unknown[]) {
  return value.filter((item): item is {
    type?: string;
    text?: string;
    createdAt?: string;
    team?: "red" | "blue";
    targetTeam?: "red" | "blue";
    damage?: number;
  } => typeof item === "object" && item !== null);
}
