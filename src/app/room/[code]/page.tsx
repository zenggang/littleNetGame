"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RoomPrepScreen } from "@/components/game-shell/RoomPrepScreen";
import {
  getRoomSnapshot,
  joinRoom,
  readPlayerSession,
  startMatch,
  subscribeToRoom,
  switchTeam,
  toUserMessage,
} from "@/lib/supabase/game-store";
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

  useEffect(() => {
    if (!hydrated || !snapshot?.room || snapshot.room.activeMatchId) {
      return;
    }

    const timer = window.setInterval(() => {
      void loadSnapshot();
    }, 1500);

    return () => window.clearInterval(timer);
  }, [hydrated, loadSnapshot, snapshot?.room, snapshot?.room?.activeMatchId]);

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

        <RoomPrepScreen
          blueMembers={blueMembers}
          busy={busy}
          canStart={snapshot.canStart}
          canJoinTeam={Boolean(snapshot.viewer) && room.status === "open"}
          error={error}
          isHost={snapshot.viewer?.playerId === room.hostPlayerId}
          onCopyCode={() => navigator.clipboard.writeText(room.code)}
          onJoinTeam={async (team) => {
            try {
              await switchTeam(roomCode, team);
              await loadSnapshot();
            } catch (nextError) {
              setError(toUserMessage(nextError));
            }
          }}
          onStart={async () => {
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
          redMembers={redMembers}
          roomCode={room.code}
          roomLabel={`${room.gradeLabel} · ${room.capacity} 人房`}
        />
      </section>
    </main>
  );
}
