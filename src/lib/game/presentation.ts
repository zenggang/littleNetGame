import type { TeamState } from "@/lib/game/types";

export const BATTLE_HP_DISPLAY_SCALE = 28;

/**
 * 当前服务端仍以 100 点左右的轻量 HP 做真实结算。
 * 设定图里的战斗面板使用 2800 量级，这里只做展示倍率换算，不改变权威战斗规则。
 */
export function formatBattleHp(team: Pick<TeamState, "hpCurrent" | "hpMax">) {
  return `${team.hpCurrent * BATTLE_HP_DISPLAY_SCALE} / ${team.hpMax * BATTLE_HP_DISPLAY_SCALE}`;
}

export function formatBattleHpValue(value: number) {
  return value * BATTLE_HP_DISPLAY_SCALE;
}
