import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Loader2, TrendingUp, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DataUnavailable } from "@/components/data-unavailable";
import { useProfile } from "@/lib/profile";
import { runDeepAnalysis, type DeepAnalysis } from "@/lib/decision.functions";
import { t } from "@/lib/i18n";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "Deep Analyze — PREDI-FARM X" },
      {
        name: "description",
        content:
          "Multi-day profit chart, disease risk, best sell window and crop-quality breakdown.",
      },
      { property: "og:title", content: "Deep Analyze — PREDI-FARM X" },
      { property: "og:description", content: "7-day profit projection + crop quality breakdown." },
    ],
  }),
  component: AnalyzePage,
});

function AnalyzePage() {
  const { profile, hydrated } = useProfile();
  const lang = profile?.language ?? "en";

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("no profile");
      return runDeepAnalysis({
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

  if (hydrated && !profile) {
    return (
      <AppShell>
        <DataUnavailable title={t("begin", lang)} reason={t("action_hero_missing_profile", lang)} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("analyze", lang)}</h1>
          <p className="text-sm text-muted-foreground">{t("analyze_sub", lang)}</p>
        </div>

        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="bg-brand text-brand-foreground rounded-xl py-3 font-semibold shadow-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {mutation.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> {t("loading", lang)}
            </>
          ) : (
            <>
              <Sparkles className="size-4" />{" "}
              {mutation.data ? t("regenerate", lang) : t("run_analysis", lang)}
            </>
          )}
        </button>

        {mutation.error && (
          <div className="bg-bad/10 border border-bad/20 text-bad rounded-xl p-3 text-sm">
            {(mutation.error as Error).message}
          </div>
        )}

        {mutation.data && <AnalysisView data={mutation.data} lang={lang} />}
      </div>
    </AppShell>
  );
}

function AnalysisView({ data, lang }: { data: DeepAnalysis; lang: "en" | "hi" }) {
  const max = Math.max(...data.profitByHarvestDay.map((d) => Math.abs(d.expectedProfitRupees)), 1);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-foreground/80 bg-surface ring-1 ring-black/5 rounded-2xl p-4">
        {data.summary}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Stat
          label={t("yield_forecast", lang)}
          value={`${data.yieldForecastQuintals} qtl · ${data.yieldForecastQuintals * 100} kg`}
          reason={data.yieldReasoning}
        />
        <Stat
          label={t("disease_risk", lang)}
          value={`${Math.round(data.diseaseRiskScore)}/100`}
          reason={data.diseaseRiskReasoning}
        />
      </div>

      <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 inline-flex items-center gap-1">
          <TrendingUp className="size-3" /> {t("best_sell_window", lang)}
        </div>
        <div className="text-lg font-semibold">
          {lang === "hi"
            ? `${data.bestSellWindow.startDaysFromNow}–${data.bestSellWindow.endDaysFromNow} दिन में`
            : `Day ${data.bestSellWindow.startDaysFromNow}–${data.bestSellWindow.endDaysFromNow}`}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{data.bestSellWindow.reasoning}</p>
      </div>

      <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-4">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          {t("chart_profit_by_day", lang)}
        </div>
        <div className="flex items-end gap-1 h-40">
          {data.profitByHarvestDay.map((d) => {
            const h = (Math.abs(d.expectedProfitRupees) / max) * 100;
            const positive = d.expectedProfitRupees >= 0;
            return (
              <div key={d.dayOffset} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] font-mono text-muted-foreground">
                  {formatINR(d.expectedProfitRupees, lang)}
                </div>
                <div
                  className={`w-full rounded-t ${positive ? "bg-brand" : "bg-bad"}`}
                  style={{ height: `${h}%` }}
                />
                <div className="text-[10px] text-muted-foreground">D+{d.dayOffset}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {t("crop_quality", lang)}
        </div>
        <QBlock label={t("quality_chemical", lang)} text={data.cropQuality.chemical} />
        <QBlock label={t("quality_biochemical", lang)} text={data.cropQuality.biochemical} />
        <QBlock label={t("quality_physical", lang)} text={data.cropQuality.physical} />
        <List label={t("how_to_improve", lang)} items={data.cropQuality.howToImprove} />
        <List label={t("how_to_maintain", lang)} items={data.cropQuality.howToMaintain} />
      </div>
    </div>
  );
}

function Stat({ label, value, reason }: { label: string; value: string; reason: string }) {
  return (
    <div className="bg-surface ring-1 ring-black/5 rounded-xl p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{reason}</p>
    </div>
  );
}
function QBlock({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <p className="text-sm text-foreground/80">{text}</p>
    </div>
  );
}
function List({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <ul className="list-disc pl-5 text-sm text-foreground/80 space-y-1">
        {items.map((i, x) => (
          <li key={x}>{i}</li>
        ))}
      </ul>
    </div>
  );
}
