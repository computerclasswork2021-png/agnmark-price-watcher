import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Camera,
  CircleCheck,
  Cloud,
  Compass,
  Leaf,
  Loader2,
  Mic,
  RefreshCw,
  ThermometerSun,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataUnavailable } from "@/components/data-unavailable";
import { useProfile } from "@/lib/profile";
import { t, labelStorage, labelIrrigation } from "@/lib/i18n";
import { generateDecision, type Decision } from "@/lib/decision.functions";
import { describeCode, geocodePlace, useWeather, weatherEmoji } from "@/lib/weather";
import { cn } from "@/lib/utils";
import { formatINR, formatKm } from "@/lib/format";
import { GlassCard, AnimatedBorder } from "@/components/ui/glass-card";
import { FadeInUp, HoverScale } from "@/components/ui/animations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — PREDI-FARM X" },
      {
        name: "description",
        content:
          "Today's best farm decision, live weather, mandi prices, tasks and analysis in one place.",
      },
      { property: "og:title", content: "Dashboard — PREDI-FARM X" },
      { property: "og:description", content: "One clear decision for your farm today." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { profile, hydrated } = useProfile();
  const lang = profile?.language ?? "en";
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("no profile");
      return generateDecision({
        data: {
          farmerName: profile.farmerName,
          state: profile.state,
          district: profile.district,
          crop: profile.crop,
          farmSizeAcres: profile.farmSizeAcres,
          storageType: profile.storageType,
          storageDurationDays: profile.storageDurationDays,
          storageCapacityQuintals: profile.storageCapacityQuintals,
          transportType: profile.transportType,
          transportCostPerKm: profile.transportCostPerKm,
          maxTransportKm: profile.maxTransportKm,
          irrigation: profile.irrigation,
          language: lang,
          incomeTier: profile.incomeTier,
        },
      });
    },
  });

  useEffect(() => {
    if (hydrated && profile && !mutation.data && !mutation.isPending && !mutation.error)
      mutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, profile?.farmerName, profile?.incomeTier, profile?.language]);

  if (hydrated && !profile) {
    return (
      <AppShell>
        <WelcomeCard onStart={() => router.navigate({ to: "/onboarding" })} lang={lang} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <FadeInUp>
        <div className="flex flex-col gap-6">
          {/* Hero */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("top_recommendation", lang)}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => mutation.mutate()}
                  disabled={mutation.isPending}
                  className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  <RefreshCw className={cn("size-3", mutation.isPending && "animate-spin")} />{" "}
                  {t("refresh", lang)}
                </button>
                <span className="text-xs font-medium bg-good/10 text-good px-2 py-0.5 rounded-full ring-1 ring-good/20">
                  {t("verified", lang)}
                </span>
              </div>
            </div>
            <HoverScale>
              <DecisionCard
                decision={mutation.data}
                loading={mutation.isPending}
                error={mutation.error as Error | null}
                lang={lang}
              />
            </HoverScale>
          </section>

          {/* Secondary */}
          <div className="grid grid-cols-2 gap-4">
            <FadeInUp delay={0.1}>
              <HoverScale>
                <RiskCard decision={mutation.data} lang={lang} />
              </HoverScale>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <HoverScale>
                <WeatherStrip lang={lang} />
              </HoverScale>
            </FadeInUp>
          </div>

          {/* Analyze CTA */}
          <Link
            to="/analyze"
            className="bg-gradient-to-r from-brand to-brand/70 text-brand-foreground rounded-2xl p-5 flex items-center gap-4 shadow-sm active:scale-[0.99] transition"
          >
            <div className="size-12 shrink-0 bg-white/15 rounded-xl grid place-items-center">
              <Sparkles className="size-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{t("analyze", lang)}</div>
              <p className="text-xs text-brand-foreground/80 mt-0.5">{t("analyze_sub", lang)}</p>
            </div>
            <ArrowRight className="size-4" />
          </Link>

          {/* Farm snapshot */}
          {profile && <FarmSnapshot lang={lang} />}

          {/* Crop quality breakdown */}
          {mutation.data && <QualitySection decision={mutation.data} lang={lang} />}

          {/* Disease scan CTA */}
          <Link
            to="/scan"
            className="bg-foreground text-background rounded-2xl p-5 flex items-center gap-4 ring-1 ring-black/5 active:scale-[0.99] transition"
          >
            <div className="size-14 shrink-0 bg-white/10 rounded-xl grid place-items-center">
              <Leaf className="size-6 text-brand" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{t("disease_scan", lang)}</div>
              <p className="text-xs text-background/60 mt-0.5">{t("disease_scan_sub", lang)}</p>
            </div>
            <div className="size-8 bg-background text-foreground rounded-full grid place-items-center">
              <Camera className="size-4" />
            </div>
          </Link>

          {/* Tasks preview */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {t("todays_schedule", lang)}
              </h2>
              <Link
                to="/tasks"
                className="text-[10px] font-bold uppercase tracking-wider text-brand inline-flex items-center gap-1"
              >
                {lang === "hi" ? "सभी" : "All"} <ArrowRight className="size-3" />
              </Link>
            </div>
            <TasksList tasks={mutation.data?.dailyTasks ?? null} loading={mutation.isPending} />
          </section>
        </div>
      </FadeInUp>

      {/* Voice pill */}
      <div className="fixed bottom-20 inset-x-0 flex justify-center px-4 pointer-events-none">
        <Link
          to="/assistant"
          className="pointer-events-auto h-12 w-full max-w-sm bg-brand text-brand-foreground rounded-full shadow-xl ring-2 ring-background flex items-center justify-center gap-3 px-5 active:scale-95 transition-transform"
        >
          <Mic className="size-4 shrink-0" />
          <span className="text-sm font-medium tracking-wide">
            {lang === "hi" ? "सहायक से बोलकर पूछें" : "Ask the assistant"}
          </span>
        </Link>
      </div>
    </AppShell>
  );
}

function WelcomeCard({ onStart, lang }: { onStart: () => void; lang: "en" | "hi" }) {
  return (
    <div className="flex flex-col gap-6 py-10">
      <div className="space-y-2">
        <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-brand bg-brand/10 px-2 py-1 rounded ring-1 ring-brand/20">
          {lang === "hi" ? "निर्णय सहायक · भारत" : "Decision support · India"}
        </span>
        <h1 className="text-3xl font-semibold tracking-tight leading-tight">
          {t("tagline_home", lang)}
        </h1>
        <p className="text-sm text-muted-foreground max-w-[46ch]">
          {lang === "hi"
            ? "PREDI-FARM X मौसम, मंडी, भंडारण, परिवहन और रोग जोखिम को मिलाकर एक स्पष्ट सिफारिश देता है।"
            : "PREDI-FARM X fuses weather, mandi, storage, transport and disease risk into one recommendation."}
        </p>
      </div>
      <button
        onClick={onStart}
        className="w-full sm:w-auto bg-brand text-brand-foreground text-sm font-semibold py-3 px-5 rounded-xl inline-flex items-center gap-2 justify-center shadow-sm"
      >
        {t("begin", lang)} <ArrowRight className="size-4" />
      </button>
      <div className="grid grid-cols-2 gap-3 pt-2">
        <FeatureBullet label={lang === "hi" ? "एकीकृत निर्णय इंजन" : "Unified decision engine"} />
        <FeatureBullet label={lang === "hi" ? "स्पष्ट कारण" : "Explainable reasoning"} />
        <FeatureBullet label={lang === "hi" ? "क्या-होगा सिमुलेटर" : "What-if simulator"} />
        <FeatureBullet
          label={lang === "hi" ? "हिंदी + अंग्रेज़ी आवाज़" : "Hindi + English voice"}
        />
      </div>
    </div>
  );
}
function FeatureBullet({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-foreground/80">
      <CircleCheck className="size-4 text-brand" />
      {label}
    </div>
  );
}

function DecisionCard({
  decision,
  loading,
  error,
  lang,
}: {
  decision: Decision | undefined;
  loading: boolean;
  error: Error | null;
  lang: "en" | "hi";
}) {
  if (error) {
    return (
      <GlassCard className="p-5">
        <div className="text-sm font-bold text-bad">
          {lang === "hi" ? "निर्णय इंजन उपलब्ध नहीं" : "Decision engine unavailable"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {error.message.length > 200 ? error.message.slice(0, 200) + "…" : error.message}
        </p>
      </GlassCard>
    );
  }
  if (loading || !decision) {
    return (
      <GlassCard className="p-5 space-y-4">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="h-8 w-3/4 bg-muted rounded" />
        <div className="h-4 w-full bg-muted rounded" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-muted rounded-xl" />
          <div className="h-16 bg-muted rounded-xl" />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {lang === "hi" ? "AI सिफारिश बना रहा…" : "AI building your recommendation…"}
        </div>
      </GlassCard>
    );
  }
  const riskDot: Record<Decision["riskLevel"], string> = {
    low: "bg-good",
    moderate: "bg-warn",
    high: "bg-accent",
    critical: "bg-bad",
  };
  return (
    <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <span className="text-sm text-muted-foreground font-medium">
            {t("action_plan", lang)}
          </span>
          <h1 className="text-2xl font-semibold text-foreground leading-tight">
            {decision.actionLabel}
          </h1>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-semibold text-good">{Math.round(decision.confidence)}%</div>
          <div className="text-[10px] font-medium uppercase tracking-tight text-muted-foreground">
            {t("confidence", lang)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-muted/40 p-3 rounded-xl border border-border">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
            {t("profit_impact", lang)}
          </div>
          <div className="text-lg font-semibold text-foreground">
            {decision.profitImpactRupees >= 0 ? "+" : ""}
            {formatINR(decision.profitImpactRupees, lang)}
          </div>
          <div className="text-xs text-muted-foreground">{decision.profitBasis}</div>
        </div>
        <div className="bg-muted/40 p-3 rounded-xl border border-border">
          <div className="text-[10px] uppercase font-semibold text-muted-foreground mb-1">
            {t("risk_level", lang)}
          </div>
          <div className="flex items-center gap-1.5">
            <div className={cn("size-2 rounded-full", riskDot[decision.riskLevel])} />
            <span className="text-lg font-semibold capitalize text-foreground">
              {decision.riskLevel}
            </span>
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1">{decision.riskReason}</div>
        </div>
      </div>

      <p className="text-foreground/80 text-sm leading-relaxed text-pretty mb-2">
        {decision.headline}
      </p>
      <p className="text-muted-foreground text-xs leading-relaxed text-pretty mb-3">
        {decision.reasoning}
      </p>
      <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-md p-2 mb-4">
        <span className="font-bold uppercase tracking-wider">{t("reasoning", lang)}:</span>{" "}
        {decision.confidenceReason}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <details className="text-sm font-medium text-brand cursor-pointer">
          <summary className="list-none inline-flex items-center gap-1">
            {t("alternatives", lang)} <ArrowRight className="size-3" />
          </summary>
          <ul className="mt-3 space-y-2 text-foreground">
            {decision.alternatives.map((alt, i) => (
              <li key={i} className="text-xs bg-muted/40 rounded-lg p-2">
                <div className="font-semibold">{alt.action}</div>
                <div className="text-muted-foreground">{alt.summary}</div>
                <div className={alt.profitDeltaRupees >= 0 ? "text-good" : "text-bad"}>
                  {alt.profitDeltaRupees >= 0 ? "+" : ""}
                  {formatINR(alt.profitDeltaRupees, lang)}
                </div>
              </li>
            ))}
          </ul>
        </details>
        <Link
          to="/what-if"
          className="bg-brand text-brand-foreground text-sm font-medium py-2 px-3 flex items-center gap-1.5 rounded-lg shadow-sm ring-1 ring-brand"
        >
          <Compass className="size-4" />
          {t("what_if", lang)}
        </Link>
      </div>
    </div>
  );
}

function RiskCard({ decision, lang }: { decision: Decision | undefined; lang: "en" | "hi" }) {
  const value = decision?.farmRiskScore ?? 0;
  const angle = useMemo(() => (value / 100) * 360, [value]);
  return (
    <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
      <div className="relative size-24 mb-3 grid place-items-center">
        <div
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(var(--brand) ${angle}deg, var(--muted) 0deg)` }}
        />
        <div className="absolute inset-1.5 rounded-full bg-surface" />
        <div className="relative text-xl font-semibold font-mono">
          {!decision ? "—" : Math.round(value)}
        </div>
      </div>
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {t("farm_risk", lang)}
      </span>
      {decision?.farmRiskReasoning && (
        <p className="text-[10px] text-muted-foreground mt-2 line-clamp-3">
          {decision.farmRiskReasoning}
        </p>
      )}
    </div>
  );
}

function WeatherStrip({ lang }: { lang: "en" | "hi" }) {
  const { profile } = useProfile();
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    if (!profile) return;
    if (profile.lat && profile.lon) {
      setCoords({ lat: profile.lat, lon: profile.lon });
      return;
    }
    const q = [profile.district, profile.state].filter(Boolean).join(", ");
    if (!q) return;
    let cancelled = false;
    geocodePlace(q).then((r) => {
      if (!cancelled && r) setCoords({ lat: r.lat, lon: r.lon });
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.state, profile?.district, profile?.lat, profile?.lon, profile]);
  const { data, loading } = useWeather(coords);
  const today = data?.daily[0];
  return (
    <Link
      to="/weather"
      className="bg-surface ring-1 ring-black/5 rounded-2xl p-4 flex flex-col justify-between hover:ring-brand/30 transition"
    >
      <div className="flex justify-between items-start">
        <div className="size-8 bg-muted rounded-lg grid place-items-center text-lg leading-none">
          {data ? (
            weatherEmoji(data.current.code, data.current.isDay)
          ) : loading ? (
            "…"
          ) : (
            <ThermometerSun className="size-4 text-muted-foreground" />
          )}
        </div>
        <span className="text-xl font-semibold text-foreground">
          {data ? `${Math.round(data.current.tempC)}°C` : "—°C"}
        </span>
      </div>
      <div className="mt-2">
        <div className="text-sm font-medium text-foreground">{t("weather", lang)}</div>
        <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
          <Cloud className="size-3" />
          {data
            ? `${describeCode(data.current.code)} · ${today ? Math.round(today.precipProb) + "% rain" : ""}`
            : loading
              ? t("loading", lang)
              : t("data_unavailable", lang)}
        </div>
      </div>
    </Link>
  );
}

function FarmSnapshot({ lang }: { lang: "en" | "hi" }) {
  const { profile } = useProfile();
  if (!profile) return null;
  const incomeLabel =
    profile.incomeTier === "low"
      ? t("low_income", lang)
      : profile.incomeTier === "high"
        ? t("high_income", lang)
        : t("middle_income", lang);
  return (
    <section className="bg-surface ring-1 ring-black/5 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("farm_snapshot", lang)}
        </h2>
        <Link
          to="/profile"
          className="text-[10px] font-bold uppercase tracking-wider text-brand inline-flex items-center gap-1"
        >
          {lang === "hi" ? "संपादित" : "Edit"} <ArrowRight className="size-3" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <SnapRow label={t("crop", lang)} value={profile.crop} />
        <SnapRow label={t("size", lang)} value={`${profile.farmSizeAcres} ac`} />
        <SnapRow label={t("irrigation", lang)} value={labelIrrigation(profile.irrigation, lang)} />
        <SnapRow
          label={t("storage", lang)}
          value={`${labelStorage(profile.storageType, lang)} · ${profile.storageCapacityQuintals}qtl`}
        />
        <SnapRow
          label={t("transport", lang)}
          value={`${formatINR(profile.transportCostPerKm, lang)}/km · ${formatKm(profile.maxTransportKm, lang)}`}
        />
        <SnapRow label={t("income_tier", lang)} value={incomeLabel} />
      </div>
    </section>
  );
}
function SnapRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/30 rounded-lg px-2 py-1.5">
      <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="text-xs font-medium text-foreground truncate">{value}</div>
    </div>
  );
}

function QualitySection({ decision, lang }: { decision: Decision; lang: "en" | "hi" }) {
  const q = decision.cropQuality;
  return (
    <section className="bg-surface ring-1 ring-black/5 rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="size-4 text-brand" />
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t("crop_quality", lang)}
        </h2>
      </div>
      <QB label={t("quality_chemical", lang)} text={q.chemical} />
      <QB label={t("quality_biochemical", lang)} text={q.biochemical} />
      <QB label={t("quality_physical", lang)} text={q.physical} />
      <details className="text-xs">
        <summary className="text-brand font-semibold cursor-pointer">
          {t("how_to_improve", lang)}
        </summary>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-foreground/80">
          {q.howToImprove.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </details>
      <details className="text-xs">
        <summary className="text-brand font-semibold cursor-pointer">
          {t("how_to_maintain", lang)}
        </summary>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-foreground/80">
          {q.howToMaintain.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
function QB({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <p className="text-sm text-foreground/80">{text}</p>
    </div>
  );
}

function TasksList({ tasks, loading }: { tasks: string[] | null; loading: boolean }) {
  if (loading || !tasks) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface ring-1 ring-black/5 rounded-xl p-3 h-10 animate-pulse"
          />
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {tasks.slice(0, 4).map((task, i) => (
        <div
          key={i}
          className="bg-surface ring-1 ring-black/5 rounded-xl p-3 flex items-center gap-3"
        >
          <div className="size-5 rounded border-2 border-border shrink-0" />
          <span className="text-sm font-medium text-foreground">{task}</span>
        </div>
      ))}
    </div>
  );
}

// Deprecated data-unavailable use kept from earlier; ensures no dead import.
void DataUnavailable;
