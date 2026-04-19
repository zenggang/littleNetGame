import type { RoomEngineState } from "./room-engine";

/**
 * 房间 coordinator 通常把 DO checkpoint 当作权威态。
 * 但如果用户先通过数据库 RPC 加入房间、随后才连上 websocket，
 * 旧 checkpoint 里可能还没有这名成员。
 *
 * 这种情况下必须在连接时强制回源加载一次房间态，
 * 否则房主页会出现“成员列表已经有两个人，但 coordinator 仍认为不能开局”的分叉。
 */
export function shouldRefreshRoomMembership(
  roomState: RoomEngineState | null,
  roomCode: string,
  playerId: string,
) {
  if (!roomState || roomState.room.code !== roomCode) {
    return false;
  }

  return !roomState.members.some((member) => member.playerId === playerId);
}
