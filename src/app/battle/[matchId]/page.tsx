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
  submitAnswer,
  subscribeToMatch,
  tickMatch,
  toUserMessage,
} from "@/lib/supabase/game-store";
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
    const roomId = snapshot?.room?.id;
    const activeMatchId = snapshot?.match?.id;

    if (!hydrated || !roomId || !activeMatchId) {
      return;
    }

    return subscribeToMatch(roomId, activeMatchId, () => {
      loadSnapshot();
    });
  }, [hydrated, loadSnapshot, snapshot?.match?.id, snapshot?.room?.id]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (snapshot?.match?.phase === "finished") {
      router.push(`/result/${matchId}`);
    }
  }, [matchId, router, snapshot?.match?.phase]);

  const matchSession = useMatchSession({
    roomCode: snapshot?.room?.code ?? "",
    playerId: snapshot?.session?.playerId ?? "",
    nickname: snapshot?.session?.nickname ?? "",
  });

  useEffect(() => {
    if (!snapshot?.match) {
      return;
    }

    let deadline = Date.parse(snapshot.match.endsAt);

    if (snapshot.match.phase === "countdown") {
      deadline = Date.parse(snapshot.match.countdownEndsAt);
    }

    if (snapshot.match.phase === "active") {
      deadline = Math.min(deadline, Date.parse(snapshot.match.questionDeadlineAt));
    }

    const delay = Math.max(0, deadline - Date.now() + 50);
    const timer = window.setTimeout(() => {
      tickMatch(matchId)
        .then(() => loadSnapshot())
        .catch(() => undefined);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    loadSnapshot,
    matchId,
    snapshot?.match,
  ]);

  if (!hydrated || !snapshot) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>对战加载中</h1>
        </section>
      </main>
    );
  }

  if (!snapshot.match || !snapshot.room) {
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

  const room = snapshot.room;
  const match = snapshot.match;
  const state = matchSession.lastSeq > 0
    ? matchSession
    : matchStateFromSnapshot({ match });
  const viewModel = buildBattleViewModel(state, now);
  const cooldownUntil = snapshot.viewer
    ? match.cooldowns[snapshot.viewer.playerId] ?? 0
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
              disabled={match.phase !== "active" || isCoolingDown || !snapshot.viewer}
              onSubmit={async (payload) => {
                try {
                  const result = await submitAnswer(matchId, payload);
                  setFeedback(result.message);
                  await loadSnapshot();
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
