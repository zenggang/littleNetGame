import type { ReactNode } from "react";

type BattleHudProps = {
  prompt: string;
  damage: number;
  secondsLeft: number;
  hint: string;
  children: ReactNode;
};

export function BattleHud({
  prompt,
  damage,
  secondsLeft,
  hint,
  children,
}: BattleHudProps) {
  return (
    <section className="battleHudPanel">
      <header className="battleHudHeader">
        <span>当前弹药题</span>
        <span>伤害 {damage}</span>
        <span>{secondsLeft} 秒</span>
      </header>
      <div className="battleHudQuestion">{prompt}</div>
      <p className="battleHudHint">{hint}</p>
      {children}
    </section>
  );
}
