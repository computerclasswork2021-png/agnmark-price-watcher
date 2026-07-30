import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, RefreshCw, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/lib/profile";
import { generateDecision } from "@/lib/decision.functions";
import { useTasks, isDoneToday } from "@/lib/tasks";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Daily Tasks — PREDI-FARM X" },
      {
        name: "description",
        content: "Custom + AI-suggested daily tasks tuned for Indian farmers.",
      },
      { property: "og:title", content: "Daily Tasks — PREDI-FARM X" },
      { property: "og:description", content: "What to do on your farm today." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { profile, hydrated } = useProfile();
  const { tasks, hydrated: tHydrated, add, remove, toggleDone, seedAi, resetAi } = useTasks();
  const lang = profile?.language ?? "en";
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const generate = async () => {
    if (!profile) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await generateDecision({
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
          language: profile.language,
          incomeTier: profile.incomeTier,
        },
      });
      seedAi(res.dailyTasks);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (
      hydrated &&
      tHydrated &&
      profile &&
      tasks.filter((x) => x.source === "ai").length === 0 &&
      !busy
    ) {
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, tHydrated, profile?.farmerName]);

  const onAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    add(draft.trim());
    setDraft("");
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("tasks_head", lang)}</h1>
            <p className="text-sm text-muted-foreground">
              {t("tasks_personalised", lang)} {profile?.crop} · {t("in_area", lang)}{" "}
              {profile?.district || profile?.state}
            </p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => void generate()}
              disabled={busy || !profile}
              className="text-xs font-semibold text-brand inline-flex items-center gap-1"
            >
              {busy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <RefreshCw className="size-3" />
              )}{" "}
              {t("refresh", lang)}
            </button>
            <button onClick={resetAi} className="text-[10px] text-muted-foreground">
              {t("reset_defaults", lang)}
            </button>
          </div>
        </div>

        <form onSubmit={onAdd} className="flex gap-2 bg-surface ring-1 ring-black/5 rounded-xl p-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("add_task", lang)}
            className="flex-1 bg-transparent px-2 text-sm focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            className="bg-brand text-brand-foreground text-xs font-semibold px-3 rounded-lg inline-flex items-center gap-1 disabled:opacity-50"
          >
            <Plus className="size-3" /> {t("add", lang)}
          </button>
        </form>

        {err && <div className="text-xs text-bad">{err}</div>}
        {busy && tasks.length === 0 && (
          <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> {t("loading", lang)}
          </div>
        )}

        <ul className="flex flex-col gap-2">
          {tasks.map((task) => {
            const checked = isDoneToday(task);
            return (
              <li
                key={task.id}
                className="bg-surface ring-1 ring-black/5 rounded-xl p-3 flex items-start gap-3"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleDone(task.id)}
                  className="accent-brand size-4 mt-1"
                />
                <div className="flex-1">
                  <div
                    className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}
                  >
                    {task.title}
                  </div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-1 inline-flex items-center gap-1">
                    {task.source === "ai" ? (
                      <>
                        <Sparkles className="size-3" /> {t("ai_suggested", lang)}
                      </>
                    ) : (
                      t("my_task", lang)
                    )}
                  </div>
                </div>
                <button
                  onClick={() => remove(task.id)}
                  aria-label={t("delete", lang)}
                  className="text-muted-foreground hover:text-bad p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </AppShell>
  );
}
