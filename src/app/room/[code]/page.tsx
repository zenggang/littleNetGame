"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ModeCallout } from "@/components/game/mode-callout";
import { TeamColumn } from "@/components/game/team-column";
import {
  getRoomSnapshot,
  joinRoom,
  startMatch,
  subscribeToDemoStore,
  switchTeam,
} from "@/lib/demo/store";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { useHydrated } from "@/lib/use-hydrated";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const roomCode = String(params.code ?? "").toUpperCase();
  const hydrated = useHydrated();
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [, setRefreshTick] = useState(0);

  useEffect(
    () => subscribeToDemoStore(() => setRefreshTick((value) => value + 1)),
    [],
  );

  const snapshot = getRoomSnapshot(roomCode);
  const redMembers = snapshot.members.filter((member) => member.team === "red");
  const blueMembers = snapshot.members.filter((member) => member.team === "blue");

  useEffect(() => {
    if (snapshot.room?.activeMatchId) {
      router.push(`/battle/${snapshot.room.activeMatchId}`);
    }
  }, [router, snapshot.room?.activeMatchId]);

  if (!hydrated) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>房间加载中</h1>
        </section>
      </main>
    );
  }

  if (!snapshot.room) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>没找到这个房间</h1>
          <button className="primaryButton" onClick={() => router.push("/")} type="button">
            返回大厅
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <section className={styles.roomShell}>
        <header className={styles.header}>
          <div>
            <p className={styles.roomCode}>房间码 {snapshot.room.code}</p>
            <h1>集合并分队</h1>
            <p className={styles.subtle}>
              {snapshot.room.gradeLabel} · {snapshot.room.capacity} 人房
            </p>
          </div>
          <button className="ghostButton" onClick={() => navigator.clipboard.writeText(snapshot.room.code)} type="button">
            复制房间码
          </button>
        </header>

        <ModeCallout isSupabaseReady={hasSupabaseEnv} />

        {!snapshot.viewer ? (
          <section className={styles.joinPanel}>
            <h2>先加入房间</h2>
            <input
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              className="answerInput"
              placeholder="输入昵称"
            />
            <button
              className="primaryButton"
              onClick={() => {
                try {
                  joinRoom({ roomCode, nickname });
                  setError("");
                  setRefreshTick((value) => value + 1);
                } catch {
                  setError("房间已满，或者已经开始了。");
                }
              }}
              type="button"
            >
              进入房间
            </button>
          </section>
        ) : null}

        <section className={styles.teams}>
          <TeamColumn
            team="red"
            members={redMembers}
            activePlayerId={snapshot.session?.playerId ?? null}
            onJoin={snapshot.viewer ? (team) => switchTeam(roomCode, team) : undefined}
            locked={snapshot.room.status !== "open"}
          />
          <TeamColumn
            team="blue"
            members={blueMembers}
            activePlayerId={snapshot.session?.playerId ?? null}
            onJoin={snapshot.viewer ? (team) => switchTeam(roomCode, team) : undefined}
            locked={snapshot.room.status !== "open"}
          />
        </section>

        <section className={styles.statusBar}>
          <div>
            <strong>可开局模式</strong>
            <span>
              2 人 = 1v1，3 人 = 1v2，4 人 = 1v3 或 2v2，6 人 = 3v3
            </span>
          </div>
          <div>
            <strong>当前状态</strong>
            <span>{snapshot.canStart ? "人数和分队已满足，可以开始" : "还没满足支持的分队组合"}</span>
          </div>
        </section>

        {snapshot.viewer?.playerId === snapshot.room.hostPlayerId ? (
          <button
            className="primaryButton"
            disabled={!snapshot.canStart}
            onClick={() => {
              try {
                const match = startMatch(roomCode);
                router.push(`/battle/${match.id}`);
              } catch {
                setError("当前还不能开局，请检查人数和分队。");
              }
            }}
            type="button"
          >
            房主开始对战
          </button>
        ) : (
          <p className={styles.waiting}>等待房主开始。你可以先换到想去的队伍。</p>
        )}

        {error ? <p className={styles.error}>{error}</p> : null}
      </section>
    </main>
  );
}
