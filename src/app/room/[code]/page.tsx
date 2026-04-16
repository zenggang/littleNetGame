"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { RoomPrepScreen } from "@/components/game-shell/RoomPrepScreen";
import { useRoomSession } from "@/lib/game/client/use-room-session";
import {
  getRoomSnapshot,
  readPlayerSession,
  toUserMessage,
} from "@/lib/supabase/game-store";
import type { CoordinatorRoomSnapshot } from "@/lib/game/protocol/coordinator";
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

  const roomSession = useRoomSession({
    roomCode,
    playerId: snapshot?.session?.playerId ?? "",
    nickname,
    initialSnapshot: snapshot && snapshot.session
      ? {
          ...snapshot,
          session: snapshot.session,
        } satisfies CoordinatorRoomSnapshot
      : null,
  });
  const liveSnapshot = roomSession.snapshot ?? null;
  const currentMembers = liveSnapshot?.members ?? snapshot?.members ?? [];
  const redMembers = currentMembers.filter((member) => member.team === "red");
  const blueMembers = currentMembers.filter((member) => member.team === "blue");

  useEffect(() => {
    if (liveSnapshot?.room?.activeMatchId) {
      router.push(`/battle/${liveSnapshot.room.activeMatchId}`);
    }
  }, [liveSnapshot?.room?.activeMatchId, router]);

  if (!hydrated || !snapshot) {
    return (
      <main className={styles.page}>
        <section className={styles.emptyState}>
          <h1>房间加载中</h1>
        </section>
      </main>
    );
  }

  if (!liveSnapshot?.room && !snapshot.room) {
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

  const room = (liveSnapshot?.room ?? snapshot.room)!;
  const viewer = liveSnapshot?.viewer ?? snapshot.viewer;
  const canStart = liveSnapshot?.canStart ?? snapshot.canStart;

  return (
    <main className={styles.page}>
      <section className={styles.roomShell}>
        {!roomSession.connected ? (
          <p className={styles.channelHint}>正在连接战前编队频道…</p>
        ) : null}

        {!viewer ? (
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
                  const result = await roomSession.joinRoom(nickname);
                  if (!result.ok) {
                    throw new Error(result.message);
                  }
                  setError("");
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
          canStart={canStart}
          canJoinTeam={Boolean(viewer) && room.status === "open"}
          error={error}
          isHost={viewer?.playerId === room.hostPlayerId}
          onCopyCode={() => navigator.clipboard.writeText(room.code)}
          onJoinTeam={async (team) => {
            try {
              const result = await roomSession.switchTeam(team);
              if (!result.ok) {
                throw new Error(result.message);
              }
            } catch (nextError) {
              setError(toUserMessage(nextError));
            }
          }}
          onStart={async () => {
            try {
              setBusy(true);
              const result = await roomSession.startMatch();
              if (!result.ok || !result.matchId) {
                throw new Error(result.message);
              }
              router.push(`/battle/${result.matchId}`);
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
