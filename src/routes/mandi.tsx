import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/app-shell";
import { DataUnavailable } from "@/components/data-unavailable";
import { useProfile } from "@/lib/profile";
import { fetchMandiPrices, type MandiRecord } from "@/lib/mandi.functions";
import { t } from "@/lib/i18n";
import { formatINR, formatIST } from "@/lib/format";

export const Route = createFileRoute("/mandi")({
  head: () => ({
    meta: [
      { title: "Mandi Prices — PREDI-FARM X" },
      { name: "description", content: "Live AGMARKNET mandi prices ranked by net profit after transport cost." },
      { property: "og:title", content: "Mandi Prices — PREDI-FARM X" },
      { property: "og:description", content: "Highest price is not always best. Highest net profit is." },
    ],
  }),
  component: MandiPage,
});

type Row = MandiRecord & { distanceKm: number; netPerQuintal: number };

function MandiPage() {
  const { profile, hydrated } = useProfile();
  const lang = profile?.language ?? "en";
  const fetchPrices = useServerFn(fetchMandiPrices);

  const [records, setRecords] = useState<MandiRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [fallback, setFallback] = useState<string>("none");
  const [defaultKm, setDefaultKm] = useState(25);
  const [overrides, setOverrides] = useState<Record<string, number>>({});

  const perKm = profile?.transportCostPerKm ?? 15;

  async function load() {
    if (!profile) return;
    setLoading(true); setError(null);
    try {
      const res = await fetchPrices({
        data: { crop: profile.crop, state: profile.state, district: profile.district, limit: 100 },
      });
      setRecords(res.records);
      setFetchedAt(res.fetchedAt);
      setFallback(res.fallbackUsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setRecords(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hydrated && profile && records === null && !loading && !error) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, profile?.crop, profile?.state]);

  const rows: Row[] = useMemo(() => {
    if (!records) return [];
    return records.map((r, i) => {
      const km = overrides[`${r.market}-${i}`] ?? defaultKm;
      return { ...r, distanceKm: km, netPerQuintal: r.modalPrice - perKm * 2 * km };
    }).sort((a, b) => b.netPerQuintal - a.netPerQuintal);
  }, [records, overrides, defaultKm, perKm]);

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
          <h1 className="text-2xl font-semibold tracking-tight">
            {lang === "hi" ? "मंडी भाव — शुद्ध लाभ के अनुसार" : "Mandi prices, ranked by net profit"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lang === "hi"
              ? "AGMARKNET (data.gov.in) से लाइव। सबसे ऊंचा भाव हमेशा सबसे अच्छा नहीं होता — परिवहन लागत असली लाभ तय करती है।"
              : "Live from AGMARKNET. Highest price ≠ best deal — transport cost decides real profit."}
          </p>
        </div>

        {fallback !== "none" && rows.length > 0 && (
          <div className="rounded-lg border border-warn/30 bg-warn/10 text-warn text-xs p-3">
            {t("no_live_prices", lang)}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface/40 p-3">
          <label className="text-xs uppercase font-bold text-muted-foreground">{t("distance", lang)}</label>
          <input type="range" min={1} max={200} value={defaultKm}
            onChange={(e) => setDefaultKm(Number(e.target.value))} className="flex-1 min-w-[140px]" />
          <span className="text-sm font-mono tabular-nums">{defaultKm} km</span>
          <button type="button" onClick={() => void load()} disabled={loading}
            className="ml-auto rounded-md border border-border bg-background px-3 py-1.5 text-xs font-semibold uppercase tracking-wide hover:bg-muted disabled:opacity-50">
            {loading ? t("loading", lang) : t("refresh", lang)}
          </button>
        </div>

        {error ? (
          <DataUnavailable title="Mandi feed error" reason={error} />
        ) : loading && rows.length === 0 ? (
          <div className="grid gap-2">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-surface/40" />)}
          </div>
        ) : rows.length === 0 ? (
          <DataUnavailable
            title={lang === "hi" ? "कोई भाव नहीं मिला" : "No prices found"}
            reason={lang === "hi" ? "AGMARKNET में इस फसल के हाल के भाव नहीं हैं।" : `AGMARKNET has no recent entries for ${profile?.crop}.`}
          />
        ) : (
          <div className="grid gap-2">
            {rows.map((r, i) => {
              const key = `${r.market}-${i}`;
              const positive = r.netPerQuintal > 0;
              return (
                <div key={key} className="rounded-lg border border-border bg-surface/60 p-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase text-muted-foreground">#{i + 1}</span>
                      <h3 className="text-base font-semibold">{r.market || "—"}</h3>
                      <span className="text-xs text-muted-foreground">{r.district}, {r.state}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.commodity} · {r.variety || "—"} · {r.arrivalDate || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span>{t("modal_price", lang)} <span className="font-mono font-semibold text-foreground">{formatINR(r.modalPrice, lang)}</span>/qtl</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-[10px] uppercase font-bold text-muted-foreground">{t("distance", lang)}</label>
                      <input type="number" min={1} max={500} value={overrides[key] ?? defaultKm}
                        onChange={(e) => setOverrides((o) => ({ ...o, [key]: Math.max(1, Number(e.target.value) || 1) }))}
                        className="w-20 rounded border border-border bg-background px-2 py-1 text-xs font-mono" />
                      <span className="text-xs text-muted-foreground">{t("km_one_way", lang)}</span>
                    </div>
                  </div>
                  <div className="sm:text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground">{t("net_after_transport", lang)}</div>
                    <div className={`text-2xl font-mono font-bold tabular-nums ${positive ? "text-emerald-500" : "text-red-500"}`}>
                      {formatINR(r.netPerQuintal, lang)}
                    </div>
                    <div className="text-[11px] text-muted-foreground">{t("per_quintal", lang)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {fetchedAt && !loading && !error && (
          <p className="text-[11px] text-muted-foreground">
            data.gov.in / AGMARKNET · {formatIST(fetchedAt, lang)}
          </p>
        )}
      </div>
    </AppShell>
  );
}
