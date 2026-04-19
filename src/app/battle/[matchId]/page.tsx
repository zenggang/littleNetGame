"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { BattleHud } from "@/components/battle-runtime/BattleHud";
import { PhaserBattleStage } from "@/components/battle-runtime/PhaserBattleStage";
import { buildBattleViewModel } from "@/components/battle-runtime/build-battle-view-model";
import { QuestionForm } from "@/components/game/question-form";
import { useMatchSession } from "@/lib/game/client/use-match-session";
import { matchStateFromSnapshot } from "@/lib/game/protocol/from-supabase-snapshot";
import {
  getMatchSnapshot,
  toUserMessage,
} from "@/lib/supabase/game-store";
import type { CoordinatorMatchSnapshot } from "@/lib/game/protocol/coordinator";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const BATTLE_RESULT_REDIRECT_DELAY_MS = 1_200;

type ControlFlash = "idle" | "success" | "wrong";

export default function BattlePage() {
  const params = useParams<{ matchId: string }>();
  const router = useRouter();
  const matchId = String(params.matchId ?? "");
  const hydrated = useHydrated();
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [controlFlash, setControlFlash] = useState<ControlFlash>("idle");
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getMatchSnapshot>> | null>(null);
  const previousMatchRef = useRef<CoordinatorMatchSnapshot["match"] | null>(null);
  const coolingDownRef = useRef(false);

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
    if (liveSnapshot?.match?.phase !== "finished") {
      return;
    }

    /**
     * 结算页现在不是立即跳转，而是保留一个很短的收束窗口。
     * 这样本地 Demo 和真协调层环境都能看到“这一局结束”的视觉落点。
     */
    const timer = window.setTimeout(() => {
      router.push(`/result/${matchId}`);
    }, BATTLE_RESULT_REDIRECT_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [liveSnapshot?.match?.endedAt, liveSnapshot?.match?.phase, matchId, router]);

  useEffect(() => {
    if (controlFlash === "idle") {
      return;
    }

    const timer = window.setTimeout(() => {
      setControlFlash("idle");
    }, controlFlash === "success" ? 280 : 420);

    return () => window.clearTimeout(timer);
  }, [controlFlash]);

  const liveMatch = liveSnapshot?.match ?? null;
  const liveRoom = liveSnapshot?.room ?? null;
  const viewer = liveSnapshot?.viewer ?? null;
  const cooldownUntil = liveMatch && viewer
    ? liveMatch.cooldowns[viewer.playerId] ?? 0
    : 0;
  const isCoolingDown = cooldownUntil > now;
  const activeQuestionExpired =
    liveMatch?.phase === "active" &&
    Math.ceil((Date.parse(liveMatch.questionDeadlineAt) - now) / 1000) <= 0;
  const previousMatch = previousMatchRef.current;

  useEffect(() => {
    if (liveMatch) {
      previousMatchRef.current = liveMatch;
    }
  }, [liveMatch]);

  useEffect(() => {
    if (!coolingDownRef.current && isCoolingDown) {
      setControlFlash("wrong");
    }

    coolingDownRef.current = isCoolingDown;
  }, [isCoolingDown]);

  useEffect(() => {
    if (!activeQuestionExpired) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadSnapshot();
    }, 1_500);

    return () => window.clearInterval(timer);
  }, [activeQuestionExpired, liveMatch?.currentQuestion.key, loadSnapshot]);

  if (!hydrated || !snapshot) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>对战加载中</h1>
        </section>
      </main>
    );
  }

  if (!liveMatch || !liveRoom) {
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

  const room = liveRoom;
  const match = liveMatch;
  const state = matchStateFromSnapshot({ match });
  const viewModel = buildBattleViewModel({
    match,
    previousMatch,
    viewerTeam: viewer?.team ?? null,
    now,
    isCoolingDown,
    feedback,
    error,
  });

  return (
    <main className={styles.page}>
      <section className={styles.shell} data-tone={viewModel.controlTone}>
        <header className={styles.topBar} data-tone={viewModel.controlTone}>
          <div className={styles.topBarCopy}>
            <p className={styles.kicker}>{match.mode} · 全房同题</p>
            <strong>{viewModel.topBarPhaseLabel}</strong>
          </div>
          <div className={styles.scoreStrip}>
            <span className={`${styles.teamPill} ${styles.teamPillRed}`}>
              <span>红队</span>
              <strong>{viewModel.redHpLabel}</strong>
            </span>
            <span className={`${styles.teamPill} ${styles.teamPillBlue}`}>
              <span>蓝队</span>
              <strong>{viewModel.blueHpLabel}</strong>
            </span>
          </div>
          <span className={styles.timerPill}>{viewModel.topBarTimerLabel}</span>
        </header>

        <section className={styles.stageShell}>
          <div className={styles.stageBanner} data-tone={viewModel.stageBannerTone}>
            {viewModel.stageBannerLabel}
          </div>
          <div className={styles.stageSummary}>{viewModel.topBarLabel}</div>
          <section className={styles.stageCard} data-tone={viewModel.stageBannerTone}>
            <PhaserBattleStage cue={viewModel.stageCue} state={state} />
          </section>
        </section>

        {viewModel.questionCard ? (
          <BattleHud
            damage={viewModel.questionCard.damage}
            deckLabel={match.phase === "finished" ? "本局收束" : "当前弹药题"}
            flash={controlFlash}
            prompt={viewModel.questionCard.prompt}
            secondsLeft={viewModel.questionCard.secondsLeft}
            statusLabel={viewModel.questionCard.statusLabel}
            hint={viewModel.questionCard.hint}
            tone={viewModel.controlTone}
          >
            <QuestionForm
              question={match.currentQuestion}
              disabled={
                match.phase !== "active" ||
                isCoolingDown ||
                !viewer ||
                viewModel.questionCard.secondsLeft <= 0
              }
              flash={controlFlash}
              submitLabel={viewModel.questionCard.submitLabel}
              onSubmit={async (payload) => {
                try {
                  const result = await matchSession.submitAnswer(payload);
                  setError("");
                  setFeedback(
                    result.ok ? result.message : toUserMessage(new Error(result.message)),
                  );
                  setControlFlash(result.ok ? "success" : "wrong");
                } catch (nextError) {
                  setFeedback("");
                  setError(toUserMessage(nextError));
                  setControlFlash("wrong");
                }
              }}
            />
          </BattleHud>
        ) : null}

        <footer className={styles.footer} data-tone={viewModel.controlTone}>
          <p className={styles.footerMessage}>{viewModel.footerMessage}</p>
          <button
            className="ghostButton"
            onClick={async () => {
              try {
                const result = await matchSession.restartRoom();

                if (!result.ok) {
                  throw new Error(result.message);
                }

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
