"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { BattleHud } from "@/components/battle-runtime/BattleHud";
import { PhaserBattleStage } from "@/components/battle-runtime/PhaserBattleStage";
import { buildBattleViewModel } from "@/components/battle-runtime/build-battle-view-model";
import { QuestionForm } from "@/components/game/question-form";
import { useMatchSession } from "@/lib/game/client/use-match-session";
import { matchStateFromSnapshot } from "@/lib/game/protocol/from-supabase-snapshot";
import {
  getMatchSnapshot,
  restartRoom,
  toUserMessage,
} from "@/lib/supabase/game-store";
import type { CoordinatorMatchSnapshot } from "@/lib/game/protocol/coordinator";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function BattlePage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const matchId = String(params.matchId ?? "");
  const hydrated = useHydrated();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getMatchSnapshot>> | null>(null);

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
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  const matchSession = useMatchSession({
    roomCode: snapshot?.room?.code ?? "",
    playerId: snapshot?.session?.playerId ?? "",
    nickname: snapshot?.session?.nickname ?? "",
    initialSnapshot: snapshot && snapshot.session
      ? {
          ...snapshot,
          session: snapshot.session,
        } satisfies CoordinatorMatchSnapshot
      : null,
  });
  const liveSnapshot = matchSession.snapshot ?? snapshot;

  useEffect(() => {
    if (liveSnapshot?.match?.phase === "finished") {
      router.push(`/result/${matchId}`);
    }
  }, [liveSnapshot?.match?.phase, matchId, router]);

  if (!hydrated || !snapshot) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>对战加载中</h1>
        </section>
      </main>
    );
  }

  if (!liveSnapshot?.match || !liveSnapshot?.room) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>{error || "这场对战不见了"}</h1>
          <button className="primaryButton" onClick={() => router.push("/")} type="button">
            返回大厅
          </button>
        </section>
      </main>
    );
  }

  const room = liveSnapshot.room!;
  const match = liveSnapshot.match!;
  const viewer = liveSnapshot.viewer;
  const state = matchStateFromSnapshot({ match });
  const viewModel = buildBattleViewModel(state, now);
  const cooldownUntil = viewer
    ? match.cooldowns[viewer.playerId] ?? 0
    : 0;
  const isCoolingDown = cooldownUntil > now;

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.topBar}>
          <div>
            <p className={styles.kicker}>{match.mode} · 全房同题</p>
            <strong>{viewModel.topBarLabel}</strong>
          </div>
          <span className={styles.timerPill}>{viewModel.topBarTimerLabel}</span>
        </header>

        <section className={styles.stageCard}>
          <PhaserBattleStage state={state} />
        </section>

        {viewModel.questionCard ? (
          <BattleHud
            damage={viewModel.questionCard.damage}
            hint={match.phase === "countdown"
              ? "倒计时结束后才能提交"
              : isCoolingDown
                ? "你刚刚答错了，先等 1 秒"
                : "谁先答对，谁的队伍立刻发箭"}
            prompt={viewModel.questionCard.prompt}
            secondsLeft={viewModel.questionCard.secondsLeft}
          >
            <QuestionForm
              question={match.currentQuestion}
              disabled={match.phase !== "active" || isCoolingDown || !viewer}
              onSubmit={async (payload) => {
                try {
                  const result = await matchSession.submitAnswer(payload);
                  setFeedback(result.message);
                } catch (nextError) {
                  setError(toUserMessage(nextError));
                }
              }}
            />
          </BattleHud>
        ) : null}

        <footer className={styles.footer}>
          <p>{error || feedback || "保持专注，抢在别人前面答出来。"}</p>
          <button
            className="ghostButton"
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
            返回房间
          </button>
        </footer>
      </section>
    </main>
  );
}
