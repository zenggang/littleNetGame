"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { ModeCallout } from "@/components/game/mode-callout";
import { TeamColumn } from "@/components/game/team-column";
import {
  getRoomSnapshot,
  joinRoom,
  readPlayerSession,
  startMatch,
  subscribeToRoom,
  switchTeam,
  toUserMessage,
} from "@/lib/supabase/game-store";
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
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getRoomSnapshot>> | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSnapshot = useCallback(async () => {
    try {
      const nextSnapshot = await getRoomSnapshot(roomCode);
      setSnapshot(nextSnapshot);
      if (nextSnapshot.session?.nickname) {
        setNickname((current) => current || nextSnapshot.session?.nickname || "");
      }
      setError("");
    } catch (nextError) {
      setError(toUserMessage(nextError));
    }
  }, [roomCode]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    readPlayerSession()
      .then((session) => {
        if (session?.nickname) {
          setNickname((current) => current || session.nickname);
        }
      })
      .catch(() => undefined);

    loadSnapshot();
  }, [hydrated, loadSnapshot]);

  useEffect(() => {
    const roomId = snapshot?.room?.id;

    if (!hydrated || !roomId) {
      return;
    }

    return subscribeToRoom(roomId, () => {
      loadSnapshot();
    });
  }, [hydrated, loadSnapshot, snapshot?.room?.id]);

  const redMembers = snapshot?.members.filter((member) => member.team === "red") ?? [];
  const blueMembers = snapshot?.members.filter((member) => member.team === "blue") ?? [];

  useEffect(() => {
    if (snapshot?.room?.activeMatchId) {
      router.push(`/battle/${snapshot.room.activeMatchId}`);
    }
  }, [router, snapshot?.room?.activeMatchId]);

  if (!hydrated || !snapshot) {
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

  const room = snapshot.room;

  return (
    <main className={styles.page}>
      <section className={styles.roomShell}>
        <header className={styles.header}>
          <div>
            <p className={styles.roomCode}>房间码 {room.code}</p>
            <h1>集合并分队</h1>
            <p className={styles.subtle}>
              {room.gradeLabel} · {room.capacity} 人房
            </p>
          </div>
          <button className="ghostButton" onClick={() => navigator.clipboard.writeText(room.code)} type="button">
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
              disabled={busy}
              onClick={async () => {
                try {
                  setBusy(true);
                  await joinRoom({ roomCode, nickname });
                  setError("");
                  await loadSnapshot();
                } catch (nextError) {
                  setError(toUserMessage(nextError));
                } finally {
                  setBusy(false);
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
            onJoin={snapshot.viewer
              ? async (team) => {
                  try {
                    await switchTeam(roomCode, team);
                    await loadSnapshot();
                  } catch (nextError) {
                    setError(toUserMessage(nextError));
                  }
                }
              : undefined}
            locked={room.status !== "open"}
          />
          <TeamColumn
            team="blue"
            members={blueMembers}
            activePlayerId={snapshot.session?.playerId ?? null}
            onJoin={snapshot.viewer
              ? async (team) => {
                  try {
                    await switchTeam(roomCode, team);
                    await loadSnapshot();
                  } catch (nextError) {
                    setError(toUserMessage(nextError));
                  }
                }
              : undefined}
            locked={room.status !== "open"}
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

        {snapshot.viewer?.playerId === room.hostPlayerId ? (
          <button
            className="primaryButton"
            disabled={!snapshot.canStart || busy}
            onClick={async () => {
              try {
                setBusy(true);
                const match = await startMatch(roomCode);
                router.push(`/battle/${match.id}`);
              } catch (nextError) {
                setError(toUserMessage(nextError));
              } finally {
                setBusy(false);
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
