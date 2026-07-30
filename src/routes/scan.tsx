import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/lib/profile";
import { diagnoseLeaf, type Diagnosis } from "@/lib/disease.functions";
import { t } from "@/lib/i18n";
import { GlassCard } from "@/components/ui/glass-card";
import { FadeInUp, HoverScale } from "@/components/ui/animations";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Crop Disease Scan — PREDI-FARM X" },
      {
        name: "description",
        content: "Upload a leaf photo. AI identifies disease with income-tier-matched treatment.",
      },
      { property: "og:title", content: "Crop Disease Scan — PREDI-FARM X" },
      { property: "og:description", content: "Photo in, actionable diagnosis out." },
    ],
  }),
  component: ScanPage,
});

function ScanPage() {
  const { profile } = useProfile();
  const lang = profile?.language ?? "en";
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mutation = useMutation({
    mutationFn: async (imageDataUrl: string) =>
      diagnoseLeaf({
        data: {
          imageDataUrl,
          crop: profile?.crop ?? "Wheat",
          language: profile?.language ?? "en",
          incomeTier: profile?.incomeTier ?? "middle",
        },
      }),
  });

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setPreview(url);
      mutation.mutate(url);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AppShell>
      <FadeInUp>
        <div className="flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-2xl font-semibold tracking-tight">{t("scan_head", lang)}</h1>
            <p className="text-sm text-muted-foreground">{t("scan_sub", lang)}</p>
          </motion.div>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          />

          {!preview && (
            <HoverScale scale={1.02}>
              <button
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-10 flex flex-col items-center gap-3 bg-gradient-to-br from-brand/5 to-transparent hover:from-brand/10 transition-all duration-300"
              >
                <div className="size-14 rounded-full bg-brand/10 grid place-items-center">
                  <Camera className="size-6 text-brand" />
                </div>
                <span className="text-sm font-semibold">{t("upload_leaf", lang)}</span>
                <span className="text-xs text-muted-foreground">{t("best_single_leaf", lang)}</span>
              </button>
            </HoverScale>
          )}

          {preview && (
            <GlassCard className="overflow-hidden p-0">
              <img src={preview} alt="Uploaded leaf" className="w-full h-64 object-cover" />
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full py-2 text-xs font-semibold text-brand hover:bg-white/5 dark:hover:bg-white/10 transition-colors"
              >
                {t("different_photo", lang)}
              </button>
            </GlassCard>
          )}

          {mutation.isPending && (
            <motion.div
              className="flex items-center gap-2 text-sm text-muted-foreground"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Loader2 className="size-4 animate-spin" /> {t("analysing", lang)}
            </motion.div>
          )}
          {mutation.error && (
            <GlassCard className="border-bad/30 bg-bad/5 p-3 text-sm">
              <div className="text-bad font-semibold">{t("error", lang)}</div>
              <p className="text-xs text-bad/80 mt-1">{(mutation.error as Error).message}</p>
            </GlassCard>
          )}
          {mutation.data && <DiagnosisCard diag={mutation.data} lang={lang} />}
        </div>
      </FadeInUp>
    </AppShell>
  );
}

function DiagnosisCard({ diag, lang }: { diag: Diagnosis; lang: "en" | "hi" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <GlassCard className="p-5 flex flex-col gap-4">
        {diag.needsMoreImages && (
          <GlassCard className="border-warn/30 bg-warn/5 p-3 text-sm">
            <AlertTriangle className="size-4 text-warn mt-0.5" />
            <div>
              <div className="font-semibold">{t("more_images", lang)}</div>
              <div className="text-xs text-muted-foreground">{t("low_quality", lang)}</div>
            </div>
          </GlassCard>
        )}

        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {t("diagnosis", lang)}
            </div>
            <h2 className="text-xl font-semibold">{diag.disease}</h2>
            <div className="flex items-center gap-2 mt-1">
              <SeverityChip severity={diag.severity} />
              <span className="text-xs text-muted-foreground">
                {t("confidence", lang)} {Math.round(diag.confidence)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1 italic">{diag.severityReasoning}</p>
          </div>
          {diag.severity === "healthy" && <CheckCircle2 className="size-6 text-good" />}
        </div>

        <p className="text-sm text-foreground/80">{diag.reasoning}</p>

        <Details title={t("symptoms", lang)} items={diag.symptoms} />
        <Details title={t("treatment", lang)} items={diag.treatment} />
        <Details title={t("prevention", lang)} items={diag.prevention} />
        <Details title={t("quality_chemical", lang)} items={diag.chemicalControl} />
        <Details title={t("quality_biochemical", lang)} items={diag.biochemicalControl} />
        <Details title={t("quality_physical", lang)} items={diag.physicalControl} />
      </GlassCard>
    </motion.div>
  );
}

function SeverityChip({ severity }: { severity: Diagnosis["severity"] }) {
  const color: Record<Diagnosis["severity"], string> = {
    healthy: "bg-good/10 text-good ring-good/20",
    mild: "bg-warn/10 text-warn ring-warn/20",
    moderate: "bg-accent/10 text-accent ring-accent/20",
    severe: "bg-bad/10 text-bad ring-bad/20",
    unknown: "bg-muted text-muted-foreground ring-border",
  };
  return (
    <span
      className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ring-1 ${color[severity]}`}
    >
      {severity}
    </span>
  );
}

function Details({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
        {title}
      </div>
      <ul className="list-disc pl-5 text-sm space-y-1 text-foreground/80">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}
