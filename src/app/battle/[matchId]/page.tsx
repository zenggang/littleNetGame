"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { QuestionForm } from "@/components/game/question-form";
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
const ATTACK_EFFECT_MS = 3000;

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
      tickMatch(matchId).catch(() => undefined);
    }, 500);

    return () => window.clearInterval(timer);
  }, [matchId]);

  const latestEvent = snapshot?.match?.events[0];
  const recentAttack = snapshot?.match?.events.find((event) => {
    if (event.type !== "answer_correct") {
      return false;
    }

    return now - Date.parse(event.createdAt) < ATTACK_EFFECT_MS;
  });
  const effectKey = recentAttack?.id ?? latestEvent?.id ?? "idle";
  const attackTeam = recentAttack?.team ?? null;
  const injuredTeam = recentAttack?.targetTeam ?? null;

  useEffect(() => {
    if (snapshot?.match?.phase === "finished") {
      router.push(`/result/${matchId}`);
    }
  }, [matchId, router, snapshot?.match?.phase]);

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
  const redMembers = snapshot.members.filter((member) => member.team === "red");
  const blueMembers = snapshot.members.filter((member) => member.team === "blue");
  const countdownSeconds = Math.max(
    0,
    Math.ceil((Date.parse(match.countdownEndsAt) - now) / 1000),
  );
  const activeSeconds = Math.max(
    0,
    Math.ceil((Date.parse(match.endsAt) - now) / 1000),
  );
  const cooldownUntil = snapshot.viewer
    ? match.cooldowns[snapshot.viewer.playerId] ?? 0
    : 0;
  const isCoolingDown = cooldownUntil > now;

  const renderArchers = (team: "red" | "blue", count: number) =>
    Array.from({ length: Math.max(1, count) }, (_, index) => (
      <span
        key={`${team}-${count}-${index}`}
        className={`${styles.archer} ${styles[team]} ${attackTeam === team ? styles.cheer : ""}`}
      >
        <span className={styles.archerHead} />
        <span className={styles.archerBody} />
        <span className={styles.archerBow} />
      </span>
    ));

  return (
    <main className={styles.page}>
      <section className={styles.battleShell}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>{match.mode} · 全房同题</p>
            <h1>弓箭手对战</h1>
          </div>
          <div className={styles.timerCard}>
            <strong>{match.phase === "countdown" ? countdownSeconds : activeSeconds}</strong>
            <span>{match.phase === "countdown" ? "开战倒计时" : "剩余秒数"}</span>
          </div>
        </header>

        <section className={styles.battlefield}>
          {injuredTeam ? (
            <div
              key={`damage-${effectKey}`}
              className={`${styles.damageVignette} ${injuredTeam === "red" ? styles.damageLeft : styles.damageRight}`}
            />
          ) : null}
          <div className={styles.skyLayer}>
            <span className={styles.cloud} />
            <span className={styles.cloud} />
            <span className={styles.cloud} />
          </div>
          <div className={styles.sunGlow} />

          <article
            className={`${styles.camp} ${styles.redCamp} ${attackTeam === "red" ? styles.firingCamp : ""} ${injuredTeam === "red" ? styles.injuredCamp : ""}`}
          >
            <div className={styles.bannerPole} />
            {injuredTeam === "red" ? <div key={`red-hurt-${effectKey}`} className={styles.campDamageFlash} /> : null}
            <div className={styles.teamHud}>
              <div>
                <p className={styles.campLabel}>红队营地</p>
                <h2>{redMembers.length} 名弓箭手</h2>
              </div>
              <div className={styles.hpBadge}>
                <strong>{match.teams.red.hpCurrent}</strong>
                <span>/ {match.teams.red.hpMax}</span>
              </div>
            </div>
            <div className={styles.hpTrack}>
              <span
                className={`${styles.hpLagFill} ${styles.redLagFill}`}
                style={{
                  width: `${(match.teams.red.hpCurrent / match.teams.red.hpMax) * 100}%`,
                }}
              />
              <span
                className={`${styles.hpFill} ${styles.redFill}`}
                style={{
                  width: `${(match.teams.red.hpCurrent / match.teams.red.hpMax) * 100}%`,
                }}
              />
            </div>
            <div className={styles.archerLine}>{renderArchers("red", redMembers.length)}</div>
            <ul className={styles.memberList}>
              {redMembers.map((member) => (
                <li key={member.playerId}>
                  <span>{member.nickname}</span>
                  {member.playerId === snapshot.session?.playerId ? <em>我</em> : null}
                </li>
              ))}
            </ul>
          </article>

          <div className={styles.centerStage}>
            <div className={styles.eventRibbon}>
              <strong>{latestEvent?.text ?? "双方列阵，准备开战。"}</strong>
              <span>题号 {match.questionIndex}</span>
            </div>

            <div className={styles.arrowField}>
              <div className={styles.groundShadow} />
              {recentAttack?.team === "red" ? (
                <span key={`red-${effectKey}`} className={`${styles.projectile} ${styles.projectileRed}`}>
                  <span className={styles.arrowGlow} />
                </span>
              ) : null}
              {recentAttack?.team === "blue" ? (
                <span key={`blue-${effectKey}`} className={`${styles.projectile} ${styles.projectileBlue}`}>
                  <span className={styles.arrowGlow} />
                </span>
              ) : null}
              {latestEvent?.type === "question_timeout" ? (
                <span key={`dust-${effectKey}`} className={styles.timeoutDust}>
                  风沙掠过战场
                </span>
              ) : null}
              <div className={styles.targetMarks}>
                <span className={attackTeam === "red" ? styles.hitFlash : styles.idleMark} />
                <span className={attackTeam === "blue" ? styles.hitFlash : styles.idleMark} />
              </div>
              {recentAttack?.damage ? (
                <span
                  key={`damage-${effectKey}`}
                  className={`${styles.damageNumber} ${injuredTeam === "red" ? styles.damageLeftFloat : styles.damageRightFloat}`}
                >
                  -{recentAttack.damage}
                </span>
              ) : null}
              {recentAttack ? (
                <span
                  key={`impact-${effectKey}`}
                  className={`${styles.impactBurst} ${injuredTeam === "red" ? styles.impactLeft : styles.impactRight}`}
                >
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </span>
              ) : null}
            </div>
          </div>

          <article
            className={`${styles.camp} ${styles.blueCamp} ${attackTeam === "blue" ? styles.firingCamp : ""} ${injuredTeam === "blue" ? styles.injuredCamp : ""}`}
          >
            <div className={styles.bannerPole} />
            {injuredTeam === "blue" ? <div key={`blue-hurt-${effectKey}`} className={styles.campDamageFlash} /> : null}
            <div className={styles.teamHud}>
              <div>
                <p className={styles.campLabel}>蓝队营地</p>
                <h2>{blueMembers.length} 名弓箭手</h2>
              </div>
              <div className={styles.hpBadge}>
                <strong>{match.teams.blue.hpCurrent}</strong>
                <span>/ {match.teams.blue.hpMax}</span>
              </div>
            </div>
            <div className={styles.hpTrack}>
              <span
                className={`${styles.hpLagFill} ${styles.blueLagFill}`}
                style={{
                  width: `${(match.teams.blue.hpCurrent / match.teams.blue.hpMax) * 100}%`,
                }}
              />
              <span
                className={`${styles.hpFill} ${styles.blueFill}`}
                style={{
                  width: `${(match.teams.blue.hpCurrent / match.teams.blue.hpMax) * 100}%`,
                }}
              />
            </div>
            <div className={`${styles.archerLine} ${styles.archerLineRight}`}>
              {renderArchers("blue", blueMembers.length)}
            </div>
            <ul className={styles.memberList}>
              {blueMembers.map((member) => (
                <li key={member.playerId}>
                  <span>{member.nickname}</span>
                  {member.playerId === snapshot.session?.playerId ? <em>我</em> : null}
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className={styles.questionCard}>
          <div className={styles.questionHeader}>
            <span>当前弹药题</span>
            <strong>伤害 {match.currentQuestion.damage}</strong>
          </div>
          <h2>{match.currentQuestion.prompt}</h2>
          <p className={styles.questionHint}>
            {match.phase === "countdown"
              ? "倒计时结束后才能提交"
              : isCoolingDown
                ? "你刚刚答错了，先等 1 秒"
                : "谁先答对，谁的队伍立刻发箭"}
          </p>

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
        </section>

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
