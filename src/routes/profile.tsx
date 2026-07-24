import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { useProfile, initials, type IncomeTier } from "@/lib/profile";
import { t, labelStorage, labelTransport, labelIrrigation } from "@/lib/i18n";
import { formatINR, formatKm } from "@/lib/format";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — PREDI-FARM X" },
      { name: "description", content: "Your farm profile — farmer, crop, income tier, storage, transport." },
      { property: "og:title", content: "Profile — PREDI-FARM X" },
      { property: "og:description", content: "Manage your farm and preferences." },
    ],
  }),
  component: ProfilePage,
});

const INCOME_KEY: Record<IncomeTier, "low_income" | "middle_income" | "high_income"> = {
  low: "low_income", middle: "middle_income", high: "high_income",
};

function ProfilePage() {
  const { profile, clear, update } = useProfile();
  const router = useRouter();
  const lang = profile?.language ?? "en";

  if (!profile) {
    return (
      <AppShell>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="text-sm text-muted-foreground">{t("no_profile", lang)}</p>
          <Link to="/onboarding" className="bg-brand text-brand-foreground rounded-lg py-2 px-4 text-sm font-semibold">
            {t("begin", lang)}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <header className="flex items-center gap-4">
          <div className="size-14 rounded-full bg-brand text-brand-foreground grid place-items-center text-lg font-bold ring-2 ring-background shadow-sm">
            {initials(profile.farmerName)}
          </div>
          <div>
            <h1 className="text-xl font-semibold">{profile.farmerName}</h1>
            <p className="text-xs text-muted-foreground">
              {[profile.village, profile.district, profile.state].filter(Boolean).join(", ")}
            </p>
          </div>
        </header>

        <Group title={t("farm_snapshot", lang)}>
          <Row label={t("size", lang)}>{profile.farmSizeAcres} {lang === "hi" ? "एकड़" : "acres"}</Row>
          <Row label={t("crop", lang)}>{profile.crop}</Row>
          <Row label={t("irrigation", lang)}>{labelIrrigation(profile.irrigation, lang)}</Row>
          <Row label={t("income_tier", lang)}>
            <select
              value={profile.incomeTier}
              onChange={(e) => update({ ...profile, incomeTier: e.target.value as IncomeTier })}
              className="bg-transparent text-right font-medium focus:outline-none"
            >
              <option value="low">{t("low_income", lang)}</option>
              <option value="middle">{t("middle_income", lang)}</option>
              <option value="high">{t("high_income", lang)}</option>
            </select>
          </Row>
        </Group>

        <Group title={t("storage", lang)}>
          <Row label={t("storage_type", lang)}>{labelStorage(profile.storageType, lang)}</Row>
          <Row label={t("storage_capacity_qtl", lang)}>{profile.storageCapacityQuintals} qtl · {profile.storageCapacityQuintals * 100} kg</Row>
          <Row label={t("storage_max_days", lang)}>{profile.storageDurationDays} {lang === "hi" ? "दिन" : "days"}</Row>
        </Group>

        <Group title={t("transport", lang)}>
          <Row label={t("transport_type", lang)}>{labelTransport(profile.transportType, lang)}</Row>
          <Row label={t("transport_cost", lang)}>{formatINR(profile.transportCostPerKm, lang)}/km</Row>
          <Row label={t("transport_max_km", lang)}>{formatKm(profile.maxTransportKm, lang)}</Row>
        </Group>

        <Group title="—">
          <Row label={t("language", lang)}>
            <select
              value={profile.language}
              onChange={(e) => update({ ...profile, language: e.target.value as "en" | "hi" })}
              className="bg-transparent text-right font-medium focus:outline-none"
            >
              <option value="en">English</option>
              <option value="hi">हिंदी</option>
            </select>
          </Row>
          <Row label="GPS">{profile.lat ? `${profile.lat.toFixed(3)}, ${profile.lon?.toFixed(3)}` : "—"}</Row>
          <Row label={INCOME_KEY[profile.incomeTier]}>{t(INCOME_KEY[profile.incomeTier], lang)}</Row>
        </Group>

        <div className="flex flex-col gap-2">
          <Link to="/onboarding" className="bg-brand text-brand-foreground text-sm font-semibold py-3 px-4 rounded-xl text-center">
            {t("edit_farm", lang)}
          </Link>
          <Link to="/schemes" className="bg-surface ring-1 ring-black/5 text-sm font-semibold py-3 px-4 rounded-xl text-center text-foreground">
            {t("schemes", lang)}
          </Link>
          <button
            onClick={() => { clear(); router.navigate({ to: "/" }); }}
            className="text-xs font-semibold text-muted-foreground py-2"
          >
            {t("clear_all", lang)}
          </button>
        </div>
      </div>
    </AppShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface ring-1 ring-black/5 rounded-2xl p-4">
      <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">{title}</h2>
      <dl className="divide-y divide-border/70">{children}</dl>
    </section>
  );
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium text-foreground text-right">{children}</dd>
    </div>
  );
}
