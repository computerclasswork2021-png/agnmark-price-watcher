import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { FactorScore, HealthCategory } from "@/lib/soil/types";
import { CATEGORY_META } from "@/lib/soil/scoring";

export function GlassCard({
  className,
  children,
  ...rest
}: { className?: string; children: ReactNode } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-2xl border border-border bg-surface/70 backdrop-blur-xl shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,0,0,0.18)] transition-all duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

const toneClass = (tone: "good" | "warn" | "bad") =>
  tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-bad";

const toneStroke = (tone: "good" | "warn" | "bad") =>
  tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--bad)";

export function toneForScore(score: number): "good" | "warn" | "bad" {
  return score >= 70 ? "good" : score >= 50 ? "warn" : "bad";
}

/** Animated arc gauge for the 0–100 soil health score. */
export function ScoreGauge({
  score,
  category,
  size = 168,
  label = "Soil health",
}: {
  score: number;
  category?: HealthCategory;
  size?: number;
  label?: string;
}) {
  const tone = category ? CATEGORY_META[category].tone : toneForScore(score);
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const arc = 0.75; // 270° sweep
  const dash = circ * arc;
  const offset = dash * (1 - Math.max(0, Math.min(100, score)) / 100);

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-[225deg]" role="img" aria-label={`${label}: ${score} out of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={toneStroke(tone)}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1), stroke 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <div className={cn("font-mono text-4xl font-semibold tabular-nums leading-none", toneClass(tone))}>{score}</div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mt-1.5">{label}</div>
        {category && <div className={cn("text-xs font-semibold mt-0.5", toneClass(tone))}>{CATEGORY_META[category].label}</div>}
      </div>
    </div>
  );
}

/** Horizontal nutrient bar with an optimal band overlay. */
export function NutrientBar({
  label,
  value,
  unit,
  min,
  max,
  optimal,
  digits = 0,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  optimal: readonly [number, number];
  digits?: number;
}) {
  const pct = (n: number) => Math.max(0, Math.min(100, ((n - min) / (max - min)) * 100));
  const inBand = value >= optimal[0] && value <= optimal[1];
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-medium text-foreground/80">{label}</span>
        <span className={cn("font-mono tabular-nums font-semibold", inBand ? "text-good" : "text-warn")}>
          {value.toFixed(digits)}
          {unit && <span className="text-muted-foreground font-normal ml-0.5">{unit}</span>}
        </span>
      </div>
      <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="absolute inset-y-0 bg-good/20"
          style={{ left: `${pct(optimal[0])}%`, width: `${Math.max(2, pct(optimal[1]) - pct(optimal[0]))}%` }}
        />
        <div
          className={cn("absolute inset-y-0 left-0 rounded-full", inBand ? "bg-good" : "bg-warn")}
          style={{ width: `${pct(value)}%`, transition: "width 600ms cubic-bezier(0.22,1,0.36,1)" }}
        />
      </div>
      <div className="text-[10px] text-muted-foreground">
        Optimal {optimal[0]}–{optimal[1]} {unit}
      </div>
    </div>
  );
}

export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  return (
    <GlassCard className="p-3.5">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 text-sm font-semibold leading-snug",
          tone === "good" && "text-good",
          tone === "warn" && "text-warn",
          tone === "bad" && "text-bad",
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{hint}</div>}
    </GlassCard>
  );
}

const STATUS_TONE: Record<FactorScore["status"], "good" | "warn" | "bad"> = {
  optimal: "good",
  acceptable: "good",
  low: "warn",
  high: "warn",
  critical: "bad",
};

export function FactorRow({ factor }: { factor: FactorScore }) {
  const tone = STATUS_TONE[factor.status];
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{factor.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{factor.value}</span>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full", tone === "good" ? "bg-good" : tone === "warn" ? "bg-warn" : "bg-bad")}
              style={{ width: `${factor.score}%`, transition: "width 600ms cubic-bezier(0.22,1,0.36,1)" }}
            />
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={cn("font-mono text-sm font-semibold tabular-nums", toneClass(tone))}>{Math.round(factor.score)}</div>
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{Math.round(factor.weight * 100)}% wt</div>
        </div>
      </summary>
      <div className="pb-3 -mt-0.5 grid gap-2 text-xs leading-relaxed">
        <Explain label="Why" text={factor.reasoning} />
        <Explain label="Impact" text={factor.impact} />
        <Explain label="Do this" text={factor.action} />
      </div>
    </details>
  );
}

export function Explain({ label, text }: { label: string; text: string }) {
  return (
    <div className="grid grid-cols-[64px_1fr] gap-2">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground pt-0.5">{label}</span>
      <span className="text-foreground/80">{text}</span>
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "brand" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1",
        tone === "good" && "bg-good/10 text-good ring-good/20",
        tone === "warn" && "bg-warn/10 text-warn ring-warn/25",
        tone === "bad" && "bg-bad/10 text-bad ring-bad/20",
        tone === "brand" && "bg-brand/10 text-brand ring-brand/20",
        tone === "neutral" && "bg-muted text-muted-foreground ring-black/5",
      )}
    >
      {children}
    </span>
  );
}
