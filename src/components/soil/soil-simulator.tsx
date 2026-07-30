import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { GlassCard, Pill, ScoreGauge, SectionTitle, Explain } from "./primitives";
import { INTERVENTIONS, simulate } from "@/lib/soil/simulate";
import { evaluateSoil, sustainabilityScore } from "@/lib/soil/scoring";
import { rankCrops, yieldForCrop } from "@/lib/soil/crops";
import { fertilizerPlan } from "@/lib/soil/fertilizer";
import { generateInsights } from "@/lib/soil/insights";
import type { SoilRecord } from "@/lib/soil/types";
import { cn } from "@/lib/utils";

export function SoilSimulator({ record }: { record: SoilRecord }) {
  const [values, setValues] = useState<Record<string, number>>({});
  const base = record.measurements;

  const { result, changes } = useMemo(() => simulate(base, values), [base, values]);

  const before = useMemo(() => snapshot(record, base), [record, base]);
  const after = useMemo(() => snapshot(record, result), [record, result]);
  const dirty = changes.length > 0;

  return (
    <div className="grid gap-4">
      <GlassCard className="p-4 grid gap-3">
        <SectionTitle
          title="What-if decision simulator"
          sub="Model an intervention before you spend money on it. Every change is explained."
          right={
            dirty ? (
              <button
                onClick={() => setValues({})}
                className="flex items-center gap-1 text-xs font-semibold text-muted-foreground"
              >
                <RotateCcw className="size-3.5" /> Reset
              </button>
            ) : undefined
          }
        />
        <div className="grid grid-cols-2 gap-3 items-center">
          <motion.div
            className="grid place-items-center gap-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <ScoreGauge
              score={before.score}
              category={before.category}
              size={124}
              label="Current"
            />
          </motion.div>
          <motion.div
            className="grid place-items-center gap-1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <ScoreGauge
              score={after.score}
              category={after.category}
              size={124}
              label="Simulated"
            />
          </motion.div>
        </div>
        <div className="grid gap-2">
          <Compare
            label="Soil health"
            a={`${before.score}`}
            b={`${after.score}`}
            good={after.score >= before.score}
          />
          <Compare
            label="Yield potential"
            a={`${before.yield} t/ha`}
            b={`${after.yield} t/ha`}
            good={after.yield >= before.yield}
          />
          <Compare
            label="Organic carbon"
            a={`${base.organicCarbon.toFixed(2)}%`}
            b={`${result.organicCarbon.toFixed(2)}%`}
            good={result.organicCarbon >= base.organicCarbon}
          />
          <Compare
            label="Best crop"
            a={before.crop}
            b={after.crop}
            good={after.suitability >= before.suitability}
          />
          <Compare
            label="Crop suitability"
            a={`${before.suitability}%`}
            b={`${after.suitability}%`}
            good={after.suitability >= before.suitability}
          />
          <Compare label="Water requirement" a={before.water} b={after.water} good />
          <Compare
            label="Sustainability"
            a={`${before.sustain}`}
            b={`${after.sustain}`}
            good={after.sustain >= before.sustain}
          />
          <Compare
            label="Fertiliser cost"
            a={`₹${before.cost.toLocaleString("en-IN")}`}
            b={`₹${after.cost.toLocaleString("en-IN")}`}
            good={after.cost <= before.cost}
          />
          <Compare
            label="Risk findings"
            a={`${before.risks}`}
            b={`${after.risks}`}
            good={after.risks <= before.risks}
          />
        </div>
      </GlassCard>

      <GlassCard className="p-4 grid gap-4">
        <SectionTitle
          title="Adjust your decisions"
          sub="Use a preset or fine-tune with the slider."
        />
        {INTERVENTIONS.map((iv) => {
          const v = values[iv.id] ?? iv.neutral;
          return (
            <div
              key={iv.id}
              className="grid gap-1.5 border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold">{iv.label}</span>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {v} {iv.unit}
                </span>
              </div>
              <input
                type="range"
                min={iv.min}
                max={iv.max}
                step={iv.step}
                value={v}
                onChange={(e) => setValues((s) => ({ ...s, [iv.id]: Number(e.target.value) }))}
                className="accent-brand"
              />
              <div className="flex flex-wrap gap-1.5">
                {iv.presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setValues((s) => ({ ...s, [iv.id]: p.value }))}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 transition",
                      v === p.value
                        ? "bg-brand text-brand-foreground ring-brand"
                        : "bg-muted text-muted-foreground ring-black/5",
                    )}
                  >
                    {p.label}
                  </button>
                ))}
                <input
                  type="number"
                  value={v}
                  step={iv.step}
                  min={iv.min}
                  max={iv.max}
                  onChange={(e) => setValues((s) => ({ ...s, [iv.id]: Number(e.target.value) }))}
                  className="w-20 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-mono"
                />
              </div>
            </div>
          );
        })}
      </GlassCard>

      <GlassCard className="p-4 grid gap-3">
        <SectionTitle
          title="Why the prediction changed"
          sub="Each active change, with its agronomic reasoning."
        />
        {changes.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No changes applied yet. Move a slider or pick a preset to see the projected effect.
          </p>
        ) : (
          changes.map((c) => (
            <div
              key={c.interventionId}
              className="rounded-xl border border-border p-3 bg-background/40 grid gap-2"
            >
              <div className="flex items-center gap-2">
                <Pill tone="brand">
                  {c.label}: {c.value}
                </Pill>
              </div>
              <Explain label="Why" text={c.explanation} />
            </div>
          ))
        )}
        <p className="text-[11px] text-muted-foreground border-t border-border pt-2">
          Simulated values are model projections from published agronomic response ranges, not
          measured outcomes. Confirm with a soil re-test after the intervention.
        </p>
      </GlassCard>
    </div>
  );
}

function snapshot(record: SoilRecord, m: SoilRecord["measurements"]) {
  const health = evaluateSoil(m, record.source);
  const crops = rankCrops(m, record.context.season);
  const top = crops[0]!;
  return {
    score: health.score,
    category: health.category,
    crop: top.crop,
    suitability: top.suitability,
    water: top.waterRequirement.replace("_", " "),
    yield: yieldForCrop(top.crop, m, record.context.season),
    sustain: sustainabilityScore(m),
    cost: fertilizerPlan(m, record.context.fieldSizeAcres).totalCost,
    risks: generateInsights(m).filter((i) => i.severity === "critical" || i.severity === "warning")
      .length,
  };
}

function Compare({ label, a, b, good }: { label: string; a: string; b: string; good: boolean }) {
  const changed = a !== b;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-border px-3 py-2 bg-background/40">
      <span className="text-xs font-medium">{label}</span>
      <span className="flex items-center gap-2 font-mono text-xs tabular-nums">
        <span className={cn(changed && "text-muted-foreground line-through")}>{a}</span>
        {changed && (
          <>
            <ArrowRight className="size-3 text-muted-foreground" />
            <span
              className={cn(
                "font-semibold transition-all duration-500",
                good ? "text-good" : "text-bad",
              )}
            >
              {b}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
