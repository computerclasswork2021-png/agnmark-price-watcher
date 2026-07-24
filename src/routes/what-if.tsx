import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/lib/profile";
import { t } from "@/lib/i18n";
import { formatINR } from "@/lib/format";

export const Route = createFileRoute("/what-if")({
  head: () => ({
    meta: [
      { title: "What-if Simulator — PREDI-FARM X" },
      { name: "description", content: "Model storage, transport and price to see profit and risk impact." },
      { property: "og:title", content: "What-if Simulator — PREDI-FARM X" },
      { property: "og:description", content: "See profit and risk shift before you commit." },
    ],
  }),
  component: WhatIfPage,
});

function WhatIfPage() {
  const { profile } = useProfile();
  const lang = profile?.language ?? "en";
  const [storageDays, setStorageDays] = useState(profile?.storageDurationDays ?? 30);
  const [distanceKm, setDistanceKm] = useState(20);
  const [pricePerQuintal, setPricePerQuintal] = useState(2200);
  const [quintals, setQuintals] = useState(10);
  const transportCost = profile?.transportCostPerKm ?? 15;

  const gross = pricePerQuintal * quintals;
  const transport = transportCost * distanceKm * 2;
  const storageCost = storageDays * 8 * quintals * 0.01;
  const net = Math.round(gross - transport - storageCost);
  const riskDelta = useMemo(() => {
    let r = 0;
    if (storageDays > 60) r += 20;
    if (storageDays > 90) r += 15;
    if (distanceKm > 100) r += 15;
    return r;
  }, [storageDays, distanceKm]);

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("whatif_head", lang)}</h1>
          <p className="text-sm text-muted-foreground">{t("whatif_sub", lang)}</p>
        </div>

        <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-5 grid gap-5">
          <Slider label={t("storage_days", lang)} min={0} max={180} value={storageDays} onChange={setStorageDays} />
          <Slider label={t("transport_km", lang)} min={0} max={200} value={distanceKm} onChange={setDistanceKm} />
          <Slider label={t("mandi_price", lang)} min={500} max={8000} step={50} value={pricePerQuintal} onChange={setPricePerQuintal} />
          <Slider label={t("volume_qtl", lang)} min={1} max={500} value={quintals} onChange={setQuintals} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Metric label={t("net_profit", lang)} value={formatINR(net, lang)} tone={net >= 0 ? "good" : "bad"} />
          <Metric label={t("added_risk", lang)} value={`+${riskDelta}`} tone={riskDelta > 20 ? "bad" : riskDelta > 0 ? "warn" : "good"} />
          <Metric label={t("transport_cost_metric", lang)} value={formatINR(transport, lang)} tone="muted" />
          <Metric label={t("storage_cost_metric", lang)} value={formatINR(storageCost, lang)} tone="muted" />
        </div>
      </div>
    </AppShell>
  );
}

function Slider({ label, min, max, step = 1, value, onChange }: { label: string; min: number; max: number; step?: number; value: number; onChange: (n: number) => void }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <span>{label}</span><span className="text-foreground font-mono">{value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="accent-brand" />
    </label>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "good" | "bad" | "warn" | "muted" }) {
  const cls = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-foreground";
  return (
    <div className="bg-surface ring-1 ring-black/5 rounded-xl p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className={`text-xl font-semibold ${cls}`}>{value}</div>
    </div>
  );
}
