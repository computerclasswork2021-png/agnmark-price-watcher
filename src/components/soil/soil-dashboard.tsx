import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  AlertTriangle,
  Droplets,
  Leaf,
  Sprout,
  TrendingDown,
  TrendingUp,
  FlaskConical,
  Info,
} from "lucide-react";
import {
  FactorRow,
  GlassCard,
  NutrientBar,
  Pill,
  ScoreGauge,
  SectionTitle,
  StatTile,
  Explain,
  toneForScore,
} from "./primitives";
import type { SoilAnalysis } from "@/lib/soil";
import { evaluateSoil, IDEAL, TEXTURE_META } from "@/lib/soil/scoring";
import type { SoilRecord } from "@/lib/soil/types";
import { cn } from "@/lib/utils";
import { HoverElevation } from "@/components/premium/dashboard-enhancements";

const COLOR_LABEL: Record<string, string> = {
  very_dark: "Very dark (high organic matter)",
  dark_brown: "Dark brown",
  brown: "Brown",
  reddish: "Reddish (iron rich)",
  yellowish: "Yellowish",
  pale_grey: "Pale grey (leached / low carbon)",
};

const TYPE_LABEL: Record<string, string> = {
  alluvial: "Alluvial",
  black: "Black (regur)",
  red: "Red",
  laterite: "Laterite",
  desert: "Arid / desert",
  mountain: "Mountain",
  saline: "Saline / alkaline",
  peaty: "Peaty",
};

const SOURCE_LABEL: Record<SoilRecord["source"], string> = {
  lab_report: "Laboratory report",
  manual: "Manual entry",
  photo_estimate: "Photo estimate",
};

const SEVERITY_TONE = { critical: "bad", warning: "warn", watch: "warn", info: "good" } as const;

export function SoilDashboard({
  record,
  analysis,
  history,
  onSimulate,
}: {
  record: SoilRecord;
  analysis: SoilAnalysis;
  history: SoilRecord[];
  onSimulate: () => void;
}) {
  const m = record.measurements;
  const { health, insights, crops, fertilizer, roadmap, irrigation } = analysis;
  const top = crops[0];

  const radarData = useMemo(
    () =>
      health.factors.map((f) => ({
        factor: f.label.replace(/ \(.*\)/, ""),
        score: Math.round(f.score),
      })),
    [health.factors],
  );

  const trend = useMemo(
    () =>
      [...history]
        .sort((a, b) => (a.context.testedOn < b.context.testedOn ? -1 : 1))
        .map((r) => {
          const { score } = analysisScore(r);
          return {
            date: new Date(r.context.testedOn).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            }),
            score,
            oc: Number(r.measurements.organicCarbon.toFixed(2)),
            n: Math.round(r.measurements.nitrogen),
            ph: Number(r.measurements.ph.toFixed(1)),
          };
        }),
    [history],
  );

  const previous = history.filter((r) => r.id !== record.id)[0];
  const delta = previous ? health.score - analysisScore(previous).score : null;
  const daysSince = Math.round(
    (Date.now() - new Date(record.context.testedOn).getTime()) / 86_400_000,
  );

  const alerts = buildAlerts(record, health.score, delta, daysSince);

  return (
    <motion.div
      className="flex flex-col gap-5"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {alerts.length > 0 && (
        <motion.div
          className="grid gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {alerts.map((a, idx) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <GlassCard className="p-3 flex items-start gap-2.5 border-warn/30 bg-warn/5">
                <AlertTriangle className="size-4 text-warn shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed">
                  <span className="font-semibold">{a.title}. </span>
                  <span className="text-muted-foreground">{a.detail}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Hero */}
      <HoverElevation>
        <GlassCard className="p-5">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
            <ScoreGauge score={health.score} category={health.category} />
            <div className="flex-1 w-full grid gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <Pill tone="brand">{SOURCE_LABEL[record.source]}</Pill>
                <Pill
                  tone={health.confidence >= 80 ? "good" : health.confidence >= 60 ? "warn" : "bad"}
                >
                  {health.confidence}% confidence
                </Pill>
                {delta !== null && (
                  <Pill tone={delta >= 0 ? "good" : "bad"}>
                    {delta >= 0 ? (
                      <TrendingUp className="size-3" />
                    ) : (
                      <TrendingDown className="size-3" />
                    )}
                    {delta >= 0 ? "+" : ""}
                    {delta} vs last test
                  </Pill>
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {health.confidenceBasis}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Meta
                  label="Last analysis"
                  value={`${new Date(record.context.testedOn).toLocaleDateString("en-IN")} · ${daysSince}d ago`}
                />
                <Meta
                  label="Field"
                  value={`${record.context.fieldName || "Field"} · ${record.context.fieldSizeAcres} acre`}
                />
                <Meta label="Soil type" value={TYPE_LABEL[m.soilType] ?? m.soilType} />
                <Meta label="Texture" value={TEXTURE_META[m.texture].label} />
                <Meta label="Colour" value={COLOR_LABEL[m.color] ?? m.color} />
                <Meta label="Season" value={record.context.season} />
              </div>
            </div>
          </div>
        </GlassCard>
      </HoverElevation>

      {/* Headline recommendations */}
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Recommended crop"
          value={top ? `${top.crop} (${top.suitability}%)` : "—"}
          hint={top?.yieldPotential}
          tone="good"
        />
        <StatTile
          label="Recommended fertiliser"
          value={
            fertilizer.chemical[0]?.name ?? fertilizer.organic[0]?.name ?? "No corrective dose"
          }
          hint={fertilizer.chemical[0]?.quantity ?? fertilizer.organic[0]?.quantity}
        />
        <StatTile
          label="Sustainability"
          value={`${health.sustainability} / 100`}
          tone={toneForScore(health.sustainability)}
          hint="Carbon, salinity, structure, balance, water"
        />
        <StatTile
          label="Improvement progress"
          value={delta === null ? "Baseline test" : `${delta >= 0 ? "+" : ""}${delta} points`}
          tone={delta === null ? "neutral" : delta >= 0 ? "good" : "bad"}
          hint={
            previous
              ? `Since ${new Date(previous.context.testedOn).toLocaleDateString("en-IN")}`
              : "Record another test to track progress"
          }
        />
      </div>

      <GlassCard className="p-4 flex items-start gap-3">
        <Droplets className="size-4 text-brand shrink-0 mt-0.5" />
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            Irrigation recommendation
          </div>
          <p className="text-sm mt-1 leading-relaxed">{irrigation}</p>
        </div>
      </GlassCard>

      {/* Nutrients */}
      <GlassCard className="p-4 grid gap-4">
        <SectionTitle
          title="Nutrient profile"
          sub="Bars show the measured value against the agronomic optimum band."
        />
        <div className="grid gap-3.5 sm:grid-cols-2">
          <NutrientBar
            label="pH"
            value={m.ph}
            unit=""
            min={3}
            max={10}
            optimal={IDEAL.ph}
            digits={1}
          />
          <NutrientBar
            label="Nitrogen (N)"
            value={m.nitrogen}
            unit="kg/ha"
            min={0}
            max={700}
            optimal={IDEAL.nitrogen}
          />
          <NutrientBar
            label="Phosphorus (P)"
            value={m.phosphorus}
            unit="kg/ha"
            min={0}
            max={60}
            optimal={IDEAL.phosphorus}
          />
          <NutrientBar
            label="Potassium (K)"
            value={m.potassium}
            unit="kg/ha"
            min={0}
            max={500}
            optimal={IDEAL.potassium}
          />
          <NutrientBar
            label="Organic carbon"
            value={m.organicCarbon}
            unit="%"
            min={0}
            max={2.5}
            optimal={IDEAL.organicCarbon}
            digits={2}
          />
          <NutrientBar
            label="Moisture"
            value={m.moisture}
            unit="%"
            min={0}
            max={55}
            optimal={IDEAL.moisture}
          />
          <NutrientBar
            label="Electrical conductivity"
            value={m.ec}
            unit="dS/m"
            min={0}
            max={6}
            optimal={IDEAL.ec}
            digits={2}
          />
          <NutrientBar
            label="Water holding capacity"
            value={m.waterHoldingCapacity}
            unit="%"
            min={5}
            max={75}
            optimal={IDEAL.waterHoldingCapacity}
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
          <FlaskConical className="size-3.5" />
          Soil temperature {m.temperature.toFixed(1)} °C — optimal {IDEAL.temperature[0]}–
          {IDEAL.temperature[1]} °C for microbial mineralisation.
        </div>
      </GlassCard>

      {/* Radar */}
      <GlassCard className="p-4">
        <SectionTitle
          title="Health factor balance"
          sub="Each axis is a weighted contributor to the overall score."
        />
        <div className="h-64 mt-2 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData} outerRadius="72%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="factor"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              />
              <Radar
                dataKey="score"
                stroke="var(--brand)"
                fill="var(--brand)"
                fillOpacity={0.28}
                isAnimationActive
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-1">
          {health.factors.map((f) => (
            <FactorRow key={f.key} factor={f} />
          ))}
        </div>
      </GlassCard>

      {/* Insights */}
      <GlassCard className="p-4 grid gap-3">
        <SectionTitle
          title="Intelligent soil insights"
          sub="Observation, reasoning, impact and action for every finding."
        />
        <div className="grid gap-2.5">
          {insights.map((i) => (
            <div key={i.id} className="rounded-xl border border-border p-3 bg-background/40">
              <div className="flex items-start gap-2">
                <Pill tone={SEVERITY_TONE[i.severity]}>{i.severity}</Pill>
                <span className="text-sm font-medium leading-snug flex-1">{i.observation}</span>
              </div>
              <div className="mt-2.5 grid gap-2 text-xs">
                <Explain label="Why" text={i.reasoning} />
                <Explain label="Impact" text={i.impact} />
                <Explain label="Do this" text={i.action} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Crops */}
      <GlassCard className="p-4 grid gap-3">
        <SectionTitle
          title="Crop suitability"
          sub="Ranked against this soil's pH, nutrients, texture, salinity and season."
        />
        <div className="grid gap-2.5">
          {crops.slice(0, 6).map((c) => (
            <details
              key={c.crop}
              className="rounded-xl border border-border p-3 bg-background/40 group"
            >
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <Sprout
                  className={cn(
                    "size-4 shrink-0",
                    c.suitability >= 70
                      ? "text-good"
                      : c.suitability >= 50
                        ? "text-warn"
                        : "text-bad",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{c.crop}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {c.suitability}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        c.suitability >= 70
                          ? "bg-good"
                          : c.suitability >= 50
                            ? "bg-warn"
                            : "bg-bad",
                      )}
                      style={{
                        width: `${c.suitability}%`,
                        transition: "width 600ms cubic-bezier(0.22,1,0.36,1)",
                      }}
                    />
                  </div>
                </div>
              </summary>
              <div className="mt-3 grid gap-2 text-xs">
                <div className="flex flex-wrap gap-1.5">
                  <Pill>Yield {c.yieldPotential}</Pill>
                  <Pill>Water: {c.waterRequirement.replace("_", " ")}</Pill>
                  <Pill>{c.difficulty}</Pill>
                </div>
                <ul className="grid gap-1 text-foreground/80 list-disc pl-4">
                  {c.reasons.map((r, idx) => (
                    <li key={idx}>{r}</li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>
      </GlassCard>

      {/* Fertilizer */}
      <GlassCard className="p-4 grid gap-3">
        <SectionTitle
          title="Fertiliser plan"
          sub={`Sized for ${record.context.fieldSizeAcres} acre · estimated ₹${fertilizer.totalCost.toLocaleString("en-IN")} total`}
        />
        {fertilizer.warnings.length > 0 && (
          <div className="rounded-xl border border-warn/30 bg-warn/5 p-3 grid gap-1.5">
            {fertilizer.warnings.map((w, i) => (
              <div key={i} className="flex gap-2 text-xs">
                <AlertTriangle className="size-3.5 text-warn shrink-0 mt-0.5" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}
        <FertGroup title="Organic" items={fertilizer.organic} />
        <FertGroup title="Chemical" items={fertilizer.chemical} />
        <FertGroup title="Bio-fertiliser" items={fertilizer.bio} />
      </GlassCard>

      {/* Roadmap */}
      <GlassCard className="p-4 grid gap-3">
        <SectionTitle
          title="Soil improvement roadmap"
          sub="Sequenced so each step raises the return on the next."
        />
        <ol className="grid gap-2.5">
          {roadmap.map((s) => (
            <li key={s.week} className="flex gap-3">
              <div className="shrink-0 size-8 rounded-lg bg-brand/10 text-brand grid place-items-center text-[10px] font-bold leading-tight text-center">
                W{s.week}
              </div>
              <div className="flex-1 rounded-xl border border-border p-3 bg-background/40">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{s.title}</span>
                  <Pill>{s.effort} effort</Pill>
                </div>
                <p className="text-xs mt-1.5 text-foreground/80">{s.detail}</p>
                <p className="text-xs mt-1 text-muted-foreground">{s.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </GlassCard>

      {/* Trend */}
      {trend.length > 1 && (
        <GlassCard className="p-4">
          <SectionTitle
            title="Historical trend"
            sub="Soil health score and organic carbon across your saved analyses."
          />
          <div className="h-56 mt-3 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis
                  yAxisId="l"
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={28}
                />
                <YAxis
                  yAxisId="r"
                  orientation="right"
                  domain={[0, 2]}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Line
                  yAxisId="l"
                  type="monotone"
                  dataKey="score"
                  name="Health score"
                  stroke="var(--brand)"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="r"
                  type="monotone"
                  dataKey="oc"
                  name="Organic carbon %"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      )}

      {/* Limitations */}
      <GlassCard className="p-4 grid gap-2 border-dashed">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Confidence and limitations</span>
        </div>
        <ul className="text-xs text-muted-foreground grid gap-1 list-disc pl-5">
          {health.limitations.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
          <li>
            Scores are modelled from agronomic thresholds, not a guarantee of yield. Field response
            also depends on weather, variety and management.
          </li>
        </ul>
      </GlassCard>

      <button
        onClick={onSimulate}
        className="w-full rounded-2xl bg-brand text-brand-foreground py-3.5 text-sm font-semibold tracking-tight flex items-center justify-center gap-2 active:scale-[0.99] transition"
      >
        <Leaf className="size-4" />
        Simulate an improvement before you spend
      </button>
    </motion.div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="text-xs font-medium capitalize truncate">{value}</div>
    </div>
  );
}

function FertGroup({
  title,
  items,
}: {
  title: string;
  items: SoilAnalysis["fertilizer"]["organic"];
}) {
  if (items.length === 0) return null;
  return (
    <div className="grid gap-2">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </div>
      {items.map((item) => (
        <details key={item.name} className="rounded-xl border border-border p-3 bg-background/40">
          <summary className="cursor-pointer list-none">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{item.name}</span>
              <span className="font-mono text-xs">₹{item.costRupees.toLocaleString("en-IN")}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{item.quantity}</div>
          </summary>
          <div className="mt-2 grid gap-2 text-xs">
            <Explain label="Schedule" text={item.schedule} />
            <Explain label="Why" text={item.reasoning} />
            <Explain label="Benefit" text={item.benefit} />
          </div>
        </details>
      ))}
    </div>
  );
}

/** Lightweight score recompute used for trends and deltas. */
function analysisScore(r: SoilRecord) {
  return evaluateSoil(r.measurements, r.source);
}

function buildAlerts(record: SoilRecord, score: number, delta: number | null, daysSince: number) {
  const alerts: { id: string; title: string; detail: string }[] = [];
  const m = record.measurements;
  if (daysSince > 180) {
    alerts.push({
      id: "retest",
      title: "Soil testing is due",
      detail: `The last analysis is ${daysSince} days old. Nitrogen and moisture change within weeks, so re-test before planning the next season.`,
    });
  }
  if (
    m.nitrogen < IDEAL.nitrogen[0] ||
    m.phosphorus < IDEAL.phosphorus[0] ||
    m.potassium < IDEAL.potassium[0]
  ) {
    alerts.push({
      id: "nutrients",
      title: "Nutrients below the recommended level",
      detail:
        "At least one macronutrient sits under the ICAR low threshold. Apply the corrective dose in the fertiliser plan before sowing.",
    });
  }
  if (delta !== null && delta <= -8) {
    alerts.push({
      id: "drop",
      title: "Soil health score dropped significantly",
      detail: `The score fell ${Math.abs(delta)} points since the previous test. Review which factor lost the most and act on it first.`,
    });
  }
  if (score < 50) {
    alerts.push({
      id: "low-score",
      title: "Soil health is below the workable threshold",
      detail:
        "Prioritise organic matter and pH correction — fertiliser applied on this soil will be used inefficiently.",
    });
  }
  return alerts;
}
