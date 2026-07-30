import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sprout, Plus, Trash2, Printer, Search } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard, Pill, SectionTitle } from "@/components/soil/primitives";
import { SoilDashboard } from "@/components/soil/soil-dashboard";
import { SoilEntry } from "@/components/soil/soil-entry";
import { SoilSimulator } from "@/components/soil/soil-simulator";
import { useSoilRecords } from "@/lib/soil/store";
import { analyzeRecord } from "@/lib/soil";
import { evaluateSoil } from "@/lib/soil/scoring";
import { useProfile } from "@/lib/profile";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/soil")({
  head: () => ({
    meta: [
      { title: "Soil Intelligence Engine — PREDI-FARM X" },
      {
        name: "description",
        content:
          "Score, explain and improve your soil: lab report OCR, photo estimation, crop and fertiliser recommendations, and a what-if decision simulator.",
      },
      { property: "og:title", content: "Soil Intelligence Engine — PREDI-FARM X" },
      {
        property: "og:description",
        content: "Explainable soil health scoring and decision simulation for Indian farms.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SoilPage,
});

type Tab = "dashboard" | "new" | "history" | "simulator";

function SoilPage() {
  const { profile } = useProfile();
  const { records, hydrated, add, remove } = useSoilRecords();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [season, setSeason] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((r) => {
      const hay =
        `${r.context.farmName} ${r.context.fieldName} ${r.context.village} ${r.context.district} ${r.crop ?? ""} ${r.context.testedOn}`.toLowerCase();
      return (!q || hay.includes(q)) && (season === "all" || r.context.season === season);
    });
  }, [records, query, season]);

  const active = records.find((r) => r.id === selectedId) ?? records[0];
  const analysis = useMemo(
    () => (active ? analyzeRecord(active, profile?.incomeTier ?? "middle") : null),
    [active, profile?.incomeTier],
  );

  return (
    <AppShell>
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Sprout className="size-6 text-brand" /> Soil Intelligence
          </h1>
          <p className="text-sm text-muted-foreground">
            Explainable soil scoring, crop and fertiliser planning, and decision simulation.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-muted/60 p-1">
          {(["dashboard", "new", "history", "simulator"] as Tab[]).map((tKey) => (
            <button
              key={tKey}
              onClick={() => setTab(tKey)}
              className={cn(
                "rounded-lg py-2 text-[11px] font-bold uppercase tracking-wider capitalize transition",
                tab === tKey
                  ? "bg-surface shadow-sm ring-1 ring-black/5 text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {tKey === "new" ? "Analyse" : tKey}
            </button>
          ))}
        </div>

        {!hydrated && (
          <GlassCard className="p-8 text-center text-sm text-muted-foreground">
            Loading your soil records…
          </GlassCard>
        )}

        {hydrated &&
          tab === "dashboard" &&
          (active && analysis ? (
            <SoilDashboard
              record={active}
              analysis={analysis}
              history={records}
              onSimulate={() => setTab("simulator")}
            />
          ) : (
            <GlassCard className="p-8 grid place-items-center gap-3 text-center">
              <Sprout className="size-8 text-brand" />
              <p className="text-sm text-muted-foreground max-w-sm">
                No soil analysis yet. Enter your soil health card values, upload the report, or
                photograph the soil surface to get your first score.
              </p>
              <button
                onClick={() => setTab("new")}
                className="rounded-xl bg-brand text-brand-foreground px-4 py-2.5 text-sm font-semibold"
              >
                Start your first analysis
              </button>
            </GlassCard>
          ))}

        {hydrated && tab === "new" && (
          <SoilEntry
            defaults={{
              farmName: profile?.farmerName ? `${profile.farmerName}'s farm` : "My farm",
              village: profile?.village ?? "",
              district: profile?.district ?? "",
              state: profile?.state ?? "",
              fieldSizeAcres: profile?.farmSizeAcres ?? 1,
              crop: profile?.crop ?? "",
            }}
            onSaved={(r) => {
              add(r);
              setSelectedId(r.id);
              setTab("dashboard");
            }}
          />
        )}

        {hydrated && tab === "history" && (
          <div className="grid gap-3">
            <GlassCard className="p-3 grid gap-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2">
                <Search className="size-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search farm, field, crop, village, district or date"
                  className="flex-1 bg-transparent text-sm outline-none"
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {["all", "kharif", "rabi", "zaid", "perennial"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeason(s)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1 capitalize",
                      season === s
                        ? "bg-brand text-brand-foreground ring-brand"
                        : "bg-muted text-muted-foreground ring-black/5",
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </GlassCard>

            {filtered.length === 0 && (
              <GlassCard className="p-6 text-center text-sm text-muted-foreground">
                No records match these filters.
              </GlassCard>
            )}

            {filtered.map((r) => {
              const h = evaluateSoil(r.measurements, r.source);
              return (
                <GlassCard key={r.id} className="p-3.5 grid gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">
                        {r.context.fieldName} · {r.context.farmName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(r.context.testedOn).toLocaleDateString("en-IN")} ·{" "}
                        {r.context.village || r.context.district} · {r.context.season}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg font-semibold">{h.score}</div>
                      <Pill tone={h.score >= 70 ? "good" : h.score >= 50 ? "warn" : "bad"}>
                        {h.category}
                      </Pill>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedId(r.id);
                        setTab("dashboard");
                      }}
                      className="flex-1 rounded-lg bg-brand/10 text-brand py-2 text-xs font-semibold"
                    >
                      Open
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="rounded-lg border border-border px-3 py-2 text-xs font-semibold flex items-center gap-1"
                    >
                      <Printer className="size-3.5" /> Report
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="rounded-lg border border-border px-3 py-2 text-xs text-bad"
                      aria-label="Delete record"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </GlassCard>
              );
            })}

            <button
              onClick={() => setTab("new")}
              className="rounded-xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground flex items-center justify-center gap-2"
            >
              <Plus className="size-4" /> New analysis
            </button>
          </div>
        )}

        {hydrated &&
          tab === "simulator" &&
          (active ? (
            <SoilSimulator record={active} />
          ) : (
            <GlassCard className="p-8 text-center text-sm text-muted-foreground">
              Save a soil analysis first — the simulator projects changes from your measured
              baseline.
            </GlassCard>
          ))}

        {hydrated && active && analysis && tab === "dashboard" && (
          <GlassCard className="p-4 grid gap-2">
            <SectionTitle
              title="Report"
              sub="Print or save as PDF — executive summary plus the full technical breakdown."
            />
            <button
              onClick={() => window.print()}
              className="rounded-xl border border-border py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <Printer className="size-4" /> Generate printable report
            </button>
          </GlassCard>
        )}
      </div>
    </AppShell>
  );
}
