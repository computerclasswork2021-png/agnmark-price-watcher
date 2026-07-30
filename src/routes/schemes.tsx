import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ExternalLink } from "lucide-react";
import { useProfile } from "@/lib/profile";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/schemes")({
  head: () => ({
    meta: [
      { title: "Government Schemes — PREDI-FARM X" },
      { name: "description", content: "Verified central government agricultural schemes." },
      { property: "og:title", content: "Government Schemes — PREDI-FARM X" },
      { property: "og:description", content: "Verified schemes only." },
    ],
  }),
  component: SchemesPage,
});

const SCHEMES = [
  {
    name: { en: "PM-KISAN", hi: "पीएम-किसान" },
    benefit: {
      en: "₹6,000/year direct cash in 3 installments",
      hi: "₹6,000/वर्ष सीधे 3 किस्तों में",
    },
    eligibility: { en: "Landholding farmer families", hi: "भूमिधारी किसान परिवार" },
    docs: ["Aadhaar", "Land records", "Bank account"],
    link: "https://pmkisan.gov.in/",
  },
  {
    name: { en: "PM Fasal Bima Yojana", hi: "पीएम फसल बीमा योजना" },
    benefit: {
      en: "Subsidised crop insurance against calamity, pests, disease",
      hi: "आपदा, कीट, रोग के विरुद्ध सब्सिडी बीमा",
    },
    eligibility: {
      en: "Farmers growing notified crops in notified areas",
      hi: "अधिसूचित क्षेत्रों में अधिसूचित फसल उगाने वाले किसान",
    },
    docs: ["Aadhaar", "Bank passbook", "Sowing declaration"],
    link: "https://pmfby.gov.in/",
  },
  {
    name: { en: "Kisan Credit Card (KCC)", hi: "किसान क्रेडिट कार्ड" },
    benefit: {
      en: "Short-term credit for cultivation & post-harvest",
      hi: "खेती एवं फसल कटाई पश्चात के लिए ऋण",
    },
    eligibility: {
      en: "All farmers including tenants and SHGs",
      hi: "सभी किसान, किरायेदार और स्व-सहायता समूह",
    },
    docs: ["Application", "ID proof", "Land documents"],
    link: "https://www.myscheme.gov.in/schemes/kcc",
  },
  {
    name: { en: "Soil Health Card", hi: "मृदा स्वास्थ्य कार्ड" },
    benefit: {
      en: "Free soil test and nutrient advice every 2 years",
      hi: "हर 2 वर्ष मुफ्त मृदा जांच एवं पोषक तत्व सलाह",
    },
    eligibility: { en: "All farmers", hi: "सभी किसान" },
    docs: ["Aadhaar", "Land details"],
    link: "https://soilhealth.dac.gov.in/",
  },
];

function SchemesPage() {
  const { profile } = useProfile();
  const lang = profile?.language ?? "en";
  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("govt_schemes_head", lang)}</h1>
          <p className="text-sm text-muted-foreground">{t("govt_schemes_sub", lang)}</p>
        </div>
        <div className="flex flex-col gap-3">
          {SCHEMES.map((s) => (
            <article
              key={s.name.en}
              className="bg-surface ring-1 ring-black/5 rounded-2xl p-4 flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-semibold">{s.name[lang]}</h2>
                <a
                  href={s.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-brand inline-flex items-center gap-1"
                >
                  {t("apply", lang)} <ExternalLink className="size-3" />
                </a>
              </div>
              <p className="text-sm text-foreground/80">{s.benefit[lang]}</p>
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground">{t("eligibility", lang)}:</strong>{" "}
                {s.eligibility[lang]}
              </div>
              <div className="text-xs text-muted-foreground">
                <strong className="text-foreground">{t("documents", lang)}:</strong>{" "}
                {s.docs.join(", ")}
              </div>
            </article>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
