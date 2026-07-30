import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  useProfile,
  type FarmProfile,
  type StorageType,
  type TransportType,
  type IrrigationType,
  type IncomeTier,
} from "@/lib/profile";
import { t, labelStorage, labelTransport, labelIrrigation } from "@/lib/i18n";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your farm — PREDI-FARM X" },
      {
        name: "description",
        content: "Add farm, income, crop, storage and transport for personalised recommendations.",
      },
      { property: "og:title", content: "Set up your farm — PREDI-FARM X" },
      { property: "og:description", content: "Onboard your farm in under a minute." },
    ],
  }),
  component: OnboardingPage,
});

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Puducherry",
];

const CROPS = [
  "Wheat",
  "Rice",
  "Maize",
  "Bajra",
  "Jowar",
  "Cotton",
  "Sugarcane",
  "Mustard",
  "Groundnut",
  "Soybean",
  "Sunflower",
  "Potato",
  "Onion",
  "Tomato",
  "Brinjal",
  "Chilli",
  "Gram",
  "Moong",
  "Urad",
  "Arhar (Tur)",
  "Mango",
  "Banana",
  "Apple",
  "Guava",
  "Pomegranate",
  "Turmeric",
  "Ginger",
  "Cardamom",
  "Tea",
  "Coffee",
];

function OnboardingPage() {
  const router = useRouter();
  const { profile, update } = useProfile();
  const [form, setForm] = useState<FarmProfile>({
    farmerName: "",
    language: "en",
    incomeTier: "middle",
    state: "",
    district: "",
    village: "",
    farmSizeAcres: 1,
    crop: "Wheat",
    storageType: "own_shed" as StorageType,
    storageDurationDays: 30,
    storageCapacityQuintals: 50,
    transportType: "tractor" as TransportType,
    transportCostPerKm: 15,
    maxTransportKm: 50,
    irrigation: "borewell" as IrrigationType,
    createdAt: new Date().toISOString(),
  });
  const lang = form.language;

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const set = <K extends keyof FarmProfile>(k: K, v: FarmProfile[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const requestLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setForm((f) => ({ ...f, lat: pos.coords.latitude, lon: pos.coords.longitude })),
      () => {},
    );
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.farmerName.trim() || !form.state || !form.crop) return;
    update({ ...form, createdAt: form.createdAt || new Date().toISOString() });
    router.navigate({ to: "/" });
  };

  return (
    <AppShell>
      <form onSubmit={submit} className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lang === "hi" ? "अपने खेत की जानकारी दें" : "Tell us about your farm"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {lang === "hi"
              ? "हर विवरण सिफारिश को बेहतर बनाता है। बाद में प्रोफ़ाइल में बदल सकते हैं।"
              : "Every field influences the recommendation. You can edit later in Profile."}
          </p>
        </div>

        <Section title={t("onboard_step1", lang)}>
          <Field label={t("full_name", lang)}>
            <input
              required
              value={form.farmerName}
              onChange={(e) => set("farmerName", e.target.value)}
              className={input}
              placeholder="e.g. Mihika Bisht"
            />
          </Field>
          <Row>
            <Field label={t("language", lang)}>
              <select
                value={form.language}
                onChange={(e) => set("language", e.target.value as "en" | "hi")}
                className={input}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी (Hindi)</option>
              </select>
            </Field>
            <Field label={t("income_tier", lang)}>
              <select
                value={form.incomeTier}
                onChange={(e) => set("incomeTier", e.target.value as IncomeTier)}
                className={input}
              >
                <option value="low">{t("low_income", lang)}</option>
                <option value="middle">{t("middle_income", lang)}</option>
                <option value="high">{t("high_income", lang)}</option>
              </select>
            </Field>
          </Row>
          <Row>
            <Field label={t("village", lang)}>
              <input
                value={form.village}
                onChange={(e) => set("village", e.target.value)}
                className={input}
              />
            </Field>
            <Field label={t("district", lang)}>
              <input
                value={form.district}
                onChange={(e) => set("district", e.target.value)}
                className={input}
              />
            </Field>
          </Row>
          <Field label={t("state", lang)}>
            <select
              required
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              className={input}
            >
              <option value="">{lang === "hi" ? "चुनें…" : "Select…"}</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <button
            type="button"
            onClick={requestLocation}
            className="text-xs font-semibold text-brand self-start"
          >
            {form.lat
              ? `📍 ${t("gps_saved", lang)} (${form.lat.toFixed(2)}, ${form.lon?.toFixed(2)})`
              : `📍 ${t("use_gps", lang)}`}
          </button>
        </Section>

        <Section title={t("onboard_step2", lang)}>
          <Row>
            <Field label={t("farm_size", lang)}>
              <input
                required
                type="number"
                min={0.1}
                step={0.1}
                value={form.farmSizeAcres}
                onChange={(e) => set("farmSizeAcres", Number(e.target.value))}
                className={input}
              />
            </Field>
            <Field label={t("primary_crop", lang)}>
              <select
                required
                value={form.crop}
                onChange={(e) => set("crop", e.target.value)}
                className={input}
              >
                {CROPS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </Row>
          <Field label={t("irrigation", lang)}>
            <select
              value={form.irrigation}
              onChange={(e) => set("irrigation", e.target.value as IrrigationType)}
              className={input}
            >
              {(["rainfed", "canal", "borewell", "drip", "sprinkler"] as const).map((k) => (
                <option key={k} value={k}>
                  {labelIrrigation(k, lang)}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title={t("onboard_step3", lang)}>
          <Row>
            <Field label={t("storage_type", lang)}>
              <select
                value={form.storageType}
                onChange={(e) => set("storageType", e.target.value as StorageType)}
                className={input}
              >
                {(["none", "own_shed", "cold_storage", "warehouse", "cooperative"] as const).map(
                  (k) => (
                    <option key={k} value={k}>
                      {labelStorage(k, lang)}
                    </option>
                  ),
                )}
              </select>
            </Field>
            <Field label={t("storage_capacity_qtl", lang)}>
              <input
                type="number"
                min={0}
                value={form.storageCapacityQuintals}
                onChange={(e) => set("storageCapacityQuintals", Number(e.target.value))}
                className={input}
              />
            </Field>
          </Row>
          <Field label={t("storage_max_days", lang)}>
            <input
              type="number"
              min={0}
              value={form.storageDurationDays}
              onChange={(e) => set("storageDurationDays", Number(e.target.value))}
              className={input}
            />
          </Field>
          <Row>
            <Field label={t("transport_type", lang)}>
              <select
                value={form.transportType}
                onChange={(e) => set("transportType", e.target.value as TransportType)}
                className={input}
              >
                {(
                  [
                    "none",
                    "bicycle",
                    "motorcycle",
                    "tractor",
                    "pickup",
                    "mini_truck",
                    "truck",
                  ] as const
                ).map((k) => (
                  <option key={k} value={k}>
                    {labelTransport(k, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("transport_cost", lang)}>
              <input
                type="number"
                min={0}
                value={form.transportCostPerKm}
                onChange={(e) => set("transportCostPerKm", Number(e.target.value))}
                className={input}
              />
            </Field>
          </Row>
          <Field label={t("transport_max_km", lang)}>
            <input
              type="number"
              min={0}
              value={form.maxTransportKm}
              onChange={(e) => set("maxTransportKm", Number(e.target.value))}
              className={input}
            />
          </Field>
        </Section>

        <button
          type="submit"
          className="bg-brand text-brand-foreground rounded-xl py-3 font-semibold shadow-sm"
        >
          {t("save_and_see", lang)}
        </button>
      </form>
    </AppShell>
  );
}

const input =
  "w-full rounded-lg bg-surface ring-1 ring-black/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-surface/60 rounded-2xl p-4 border border-border flex flex-col gap-3">
      <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </span>
      {children}
    </label>
  );
}
