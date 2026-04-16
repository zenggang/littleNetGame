import type { ReactNode } from "react";

type BattleHudTone =
  | "ready"
  | "countdown"
  | "cooldown"
  | "danger"
  | "victory"
  | "defeat";

type BattleHudProps = {
  deckLabel: string;
  statusLabel: string;
  prompt: string;
  damage: number;
  secondsLeft: number;
  hint: string;
  tone: BattleHudTone;
  flash: "idle" | "success" | "wrong";
  children: ReactNode;
};

export function BattleHud({
  deckLabel,
  statusLabel,
  prompt,
  damage,
  secondsLeft,
  hint,
  tone,
  flash,
  children,
}: BattleHudProps) {
  return (
    <section className="battleHudPanel" data-flash={flash} data-tone={tone}>
      <header className="battleHudHeader">
        <div className="battleHudHeaderCopy">
          <span className="battleHudDeckLabel">{deckLabel}</span>
          <strong className="battleHudStatusLabel">{statusLabel}</strong>
        </div>
        <div className="battleHudStatRow">
          <span className="battleHudStatPill" data-kind="damage">伤害 {damage}</span>
          <span className="battleHudStatPill" data-kind="time">{secondsLeft} 秒</span>
        </div>
      </header>
      <div className="battleHudQuestion">{prompt}</div>
      <p className="battleHudHint">{hint}</p>
      <div className="battleHudBody">{children}</div>
    </section>
  );
}
