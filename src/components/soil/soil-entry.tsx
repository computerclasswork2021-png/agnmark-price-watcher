import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FileUp, Camera, PencilLine, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { GlassCard, Pill, SectionTitle, Explain } from "./primitives";
import { DEFAULT_MEASUREMENTS, FIELD_META, newId } from "@/lib/soil/store";
import type {
  SoilMeasurements,
  SoilRecord,
  Season,
  SoilTexture,
  SoilColor,
  SoilTypeName,
  DataSource,
} from "@/lib/soil/types";
import { analyzeSoilPhoto, extractSoilReport } from "@/lib/soil.functions";
import { TEXTURE_META } from "@/lib/soil/scoring";
import { cn } from "@/lib/utils";

type NumericKey = keyof typeof FIELD_META;
const NUMERIC_KEYS = Object.keys(FIELD_META) as NumericKey[];
const MAX_BYTES = 8 * 1024 * 1024;

const TEXTURES = Object.keys(TEXTURE_META) as SoilTexture[];
const COLORS: SoilColor[] = [
  "very_dark",
  "dark_brown",
  "brown",
  "reddish",
  "yellowish",
  "pale_grey",
];
const TYPES: SoilTypeName[] = [
  "alluvial",
  "black",
  "red",
  "laterite",
  "desert",
  "mountain",
  "saline",
  "peaty",
];
const SEASONS: Season[] = ["kharif", "rabi", "zaid", "perennial"];

export function SoilEntry({
  defaults,
  onSaved,
}: {
  defaults: {
    farmName: string;
    village: string;
    district: string;
    state: string;
    fieldSizeAcres: number;
    crop: string;
  };
  onSaved: (r: SoilRecord) => void;
}) {
  const [method, setMethod] = useState<"manual" | "upload" | "photo">("manual");
  const [m, setM] = useState<SoilMeasurements>({ ...DEFAULT_MEASUREMENTS });
  const [source, setSource] = useState<DataSource>("manual");
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [extraction, setExtraction] = useState<SoilRecord["extraction"]>();
  const [photo, setPhoto] = useState<SoilRecord["photo"]>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ctx, setCtx] = useState({
    farmName: defaults.farmName || "My farm",
    fieldName: "Field 1",
    fieldSizeAcres: defaults.fieldSizeAcres || 1,
    village: defaults.village,
    district: defaults.district,
    state: defaults.state,
    season: "kharif" as Season,
    testedOn: new Date().toISOString().slice(0, 10),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const dataUrl = await toDataUrl(file);
      return extractSoilReport({
        data: { fileName: file.name, mimeType: file.type || "application/pdf", dataUrl },
      });
    },
    onSuccess: (res, file) => {
      if (!res.readable) return;
      const next = { ...m };
      const hits = new Set<string>();
      for (const key of NUMERIC_KEYS) {
        const v = res.values[key as keyof typeof res.values];
        if (typeof v === "number" && Number.isFinite(v)) {
          (next[key] as number) = v;
          hits.add(key);
        }
      }
      if (res.values.texture) {
        next.texture = res.values.texture;
        hits.add("texture");
      }
      setM(next);
      setHighlighted(hits);
      setSource("lab_report");
      setExtraction({
        fileName: file.name,
        confidence: res.confidence,
        unreadableFields: res.unreadableFields,
        notes: res.notes,
      });
      if (res.sampleDate && /^\d{4}-\d{2}-\d{2}$/.test(res.sampleDate))
        setCtx((c) => ({ ...c, testedOn: res.sampleDate }));
      setMethod("manual");
    },
  });

  const photoScan = useMutation({
    mutationFn: async (file: File) =>
      analyzeSoilPhoto({ data: { imageDataUrl: await toDataUrl(file) } }),
    onSuccess: (res) => {
      if (!res.isSoilPhoto) return;
      const next = { ...m, texture: res.textureEstimate, color: res.colorClassification };
      const hits = new Set<string>(["texture", "color"]);
      if (typeof res.estimatedOrganicCarbon === "number") {
        next.organicCarbon = res.estimatedOrganicCarbon;
        hits.add("organicCarbon");
      }
      if (typeof res.estimatedPh === "number") {
        next.ph = res.estimatedPh;
        hits.add("ph");
      }
      next.moisture = { dry: 10, slightly_moist: 18, moist: 26, wet: 38 }[res.surfaceMoisture];
      hits.add("moisture");
      next.waterHoldingCapacity = Math.round(20 + TEXTURE_META[res.textureEstimate].retention * 40);
      setM(next);
      setHighlighted(hits);
      setSource("photo_estimate");
      setPhoto({
        textureEstimate: res.textureEstimate,
        surfaceMoisture: res.surfaceMoisture,
        colorClassification: res.colorClassification,
        surfaceCracking: res.surfaceCracking,
        visibleErosion: res.visibleErosion,
        organicMatterIndicators: res.organicMatterIndicators,
        generalCondition: res.generalCondition,
        caveats: res.caveats,
        confidence: res.confidence,
      });
      setMethod("manual");
    },
  });

  const setNum = (key: NumericKey, raw: string) => {
    const meta = FIELD_META[key];
    const v = Number(raw);
    setM((prev) => ({ ...prev, [key]: raw === "" ? prev[key] : v }));
    setErrors((e) => {
      const next = { ...e };
      if (raw === "" || Number.isNaN(v)) next[key] = "Enter a number.";
      else if (v < meta.min || v > meta.max)
        next[key] = `Must be between ${meta.min} and ${meta.max} ${meta.unit}.`;
      else delete next[key];
      return next;
    });
    setHighlighted((h) => {
      if (!h.has(key)) return h;
      const n = new Set(h);
      n.delete(key);
      return n;
    });
  };

  const save = () => {
    const errs: Record<string, string> = {};
    for (const key of NUMERIC_KEYS) {
      const meta = FIELD_META[key];
      const v = m[key];
      if (!Number.isFinite(v) || v < meta.min || v > meta.max)
        errs[key] = `Must be between ${meta.min} and ${meta.max} ${meta.unit}.`;
    }
    if (!ctx.fieldName.trim()) errs.fieldName = "Field name is required.";
    if (!(ctx.fieldSizeAcres > 0)) errs.fieldSizeAcres = "Field size must be greater than zero.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSaved({
      id: newId(),
      createdAt: new Date().toISOString(),
      source,
      measurements: m,
      context: { ...ctx, fieldSizeAcres: Number(ctx.fieldSizeAcres) },
      extraction,
      photo,
      crop: defaults.crop,
    });
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-3 gap-2">
        <MethodTab
          icon={PencilLine}
          label="Manual"
          active={method === "manual"}
          onClick={() => setMethod("manual")}
        />
        <MethodTab
          icon={FileUp}
          label="Upload report"
          active={method === "upload"}
          onClick={() => setMethod("upload")}
        />
        <MethodTab
          icon={Camera}
          label="Soil photo"
          active={method === "photo"}
          onClick={() => setMethod("photo")}
        />
      </div>

      {method === "upload" && (
        <GlassCard className="p-4 grid gap-3">
          <SectionTitle
            title="Upload soil health report"
            sub="PDF, JPG, JPEG or PNG up to 8 MB. Values are read by OCR and shown for your verification before saving."
          />
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/jpg"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              if (f.size > MAX_BYTES) return upload.reset();
              upload.mutate(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="rounded-xl border-2 border-dashed border-border py-10 grid place-items-center gap-2 text-sm text-muted-foreground hover:border-brand/40 transition"
          >
            {upload.isPending ? (
              <Loader2 className="size-5 animate-spin text-brand" />
            ) : (
              <FileUp className="size-5" />
            )}
            {upload.isPending ? "Reading your report…" : "Choose a report file"}
          </button>
          {upload.isError && <Notice tone="bad" text={(upload.error as Error).message} />}
          {upload.data && !upload.data.readable && (
            <Notice
              tone="bad"
              text={`Could not read this report: ${upload.data.reason} Enter the values manually instead.`}
            />
          )}
        </GlassCard>
      )}

      {method === "photo" && (
        <GlassCard className="p-4 grid gap-3">
          <SectionTitle
            title="Soil photo analysis"
            sub="Experimental. Estimates surface characteristics only."
          />
          <Notice
            tone="warn"
            text="A photograph cannot measure pH, N, P, K or salinity. This produces a visual estimate to get you started — it never replaces a laboratory soil test."
          />
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) photoScan.mutate(f);
            }}
          />
          <button
            onClick={() => photoRef.current?.click()}
            disabled={photoScan.isPending}
            className="rounded-xl border-2 border-dashed border-border py-10 grid place-items-center gap-2 text-sm text-muted-foreground hover:border-brand/40 transition"
          >
            {photoScan.isPending ? (
              <Loader2 className="size-5 animate-spin text-brand" />
            ) : (
              <Camera className="size-5" />
            )}
            {photoScan.isPending ? "Reading the soil surface…" : "Take or choose a soil photo"}
          </button>
          {photoScan.isError && <Notice tone="bad" text={(photoScan.error as Error).message} />}
          {photoScan.data && !photoScan.data.isSoilPhoto && (
            <Notice
              tone="bad"
              text="That image does not look like bare soil. Photograph the soil surface in daylight, filling the frame."
            />
          )}
        </GlassCard>
      )}

      {method === "manual" && (
        <>
          {extraction && (
            <GlassCard className="p-3.5 grid gap-2 border-good/30 bg-good/5">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <CheckCircle2 className="size-4 text-good" />
                Extracted from {extraction.fileName}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Pill tone="good">{extraction.confidence}% OCR confidence</Pill>
                {extraction.unreadableFields.map((f) => (
                  <Pill key={f} tone="warn">
                    {f} unreadable
                  </Pill>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Highlighted fields were filled automatically. Check each one against your report and
                correct it before saving.
              </p>
            </GlassCard>
          )}
          {photo && (
            <GlassCard className="p-3.5 grid gap-2 border-warn/30 bg-warn/5">
              <div className="text-sm font-semibold">Photo estimate applied</div>
              <div className="flex flex-wrap gap-1.5">
                <Pill tone="warn">{photo.confidence}% visual confidence</Pill>
                <Pill>Cracking: {photo.surfaceCracking}</Pill>
                <Pill>Erosion: {photo.visibleErosion}</Pill>
              </div>
              <p className="text-xs">{photo.generalCondition}</p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 grid gap-0.5">
                {photo.caveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </GlassCard>
          )}

          <GlassCard className="p-4 grid gap-3">
            <SectionTitle title="Field details" />
            <div className="grid grid-cols-2 gap-3">
              <Text
                label="Farm name"
                value={ctx.farmName}
                onChange={(v) => setCtx({ ...ctx, farmName: v })}
              />
              <Text
                label="Field name"
                value={ctx.fieldName}
                onChange={(v) => setCtx({ ...ctx, fieldName: v })}
                error={errors.fieldName}
              />
              <Text
                label="Field size (acre)"
                value={String(ctx.fieldSizeAcres)}
                type="number"
                onChange={(v) => setCtx({ ...ctx, fieldSizeAcres: Number(v) })}
                error={errors.fieldSizeAcres}
              />
              <Text
                label="Date of test"
                value={ctx.testedOn}
                type="date"
                onChange={(v) => setCtx({ ...ctx, testedOn: v })}
              />
              <Text
                label="Village"
                value={ctx.village}
                onChange={(v) => setCtx({ ...ctx, village: v })}
              />
              <Text
                label="District"
                value={ctx.district}
                onChange={(v) => setCtx({ ...ctx, district: v })}
              />
              <Text
                label="State"
                value={ctx.state}
                onChange={(v) => setCtx({ ...ctx, state: v })}
              />
              <Select
                label="Season"
                value={ctx.season}
                options={SEASONS}
                onChange={(v) => setCtx({ ...ctx, season: v as Season })}
              />
            </div>
          </GlassCard>

          <GlassCard className="p-4 grid gap-3">
            <SectionTitle
              title="Soil measurements"
              sub="Hover or tap a label for guidance. Defaults show the typical Indian range."
            />
            <div className="grid grid-cols-2 gap-3">
              {NUMERIC_KEYS.map((key) => {
                const meta = FIELD_META[key];
                return (
                  <label key={key} className="grid gap-1" title={meta.help}>
                    <span className="text-[11px] font-semibold text-foreground/80">
                      {meta.label}{" "}
                      {meta.unit && (
                        <span className="text-muted-foreground font-normal">({meta.unit})</span>
                      )}
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step={meta.step}
                      value={m[key]}
                      onChange={(e) => setNum(key, e.target.value)}
                      className={cn(
                        "rounded-lg border bg-background px-2.5 py-2 text-sm font-mono tabular-nums outline-none transition focus:ring-2 focus:ring-brand/30",
                        errors[key]
                          ? "border-bad"
                          : highlighted.has(key)
                            ? "border-good bg-good/5"
                            : "border-border",
                      )}
                    />
                    <span
                      className={cn(
                        "text-[10px]",
                        errors[key] ? "text-bad" : "text-muted-foreground",
                      )}
                    >
                      {errors[key] ?? `Typical ${meta.typical}`}
                    </span>
                  </label>
                );
              })}
              <Select
                label="Texture"
                value={m.texture}
                options={TEXTURES}
                onChange={(v) => setM({ ...m, texture: v as SoilTexture })}
                highlight={highlighted.has("texture")}
              />
              <Select
                label="Colour"
                value={m.color}
                options={COLORS}
                onChange={(v) => setM({ ...m, color: v as SoilColor })}
                highlight={highlighted.has("color")}
              />
              <Select
                label="Soil type"
                value={m.soilType}
                options={TYPES}
                onChange={(v) => setM({ ...m, soilType: v as SoilTypeName })}
              />
            </div>
            <Explain
              label="Note"
              text={
                source === "lab_report"
                  ? "Saved as a laboratory-grade record — recommendations will carry the highest confidence."
                  : source === "photo_estimate"
                    ? "Saved as a photo estimate. Recommendations will be marked low confidence until you add lab values."
                    : "Saved as manual entry. The engine trusts these numbers as given and cannot verify them."
              }
            />
            <button
              onClick={save}
              className="rounded-xl bg-brand text-brand-foreground py-3 text-sm font-semibold active:scale-[0.99] transition"
            >
              Save analysis
            </button>
          </GlassCard>
        </>
      )}
    </div>
  );
}

function MethodTab({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: typeof Camera;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border py-2.5 px-2 grid place-items-center gap-1 text-[11px] font-semibold transition",
        active
          ? "border-brand bg-brand/10 text-brand"
          : "border-border bg-surface/60 text-muted-foreground",
      )}
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

function Text({
  label,
  value,
  onChange,
  type = "text",
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  error?: string;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "rounded-lg border bg-background px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-brand/30",
          error ? "border-bad" : "border-border",
        )}
      />
      {error && <span className="text-[10px] text-bad">{error}</span>}
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
  highlight,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
  highlight?: boolean;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-[11px] font-semibold text-foreground/80">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "rounded-lg border bg-background px-2.5 py-2 text-sm capitalize outline-none focus:ring-2 focus:ring-brand/30",
          highlight ? "border-good bg-good/5" : "border-border",
        )}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </label>
  );
}

function Notice({ tone, text }: { tone: "warn" | "bad"; text: string }) {
  return (
    <div
      className={cn(
        "rounded-xl p-3 flex gap-2 text-xs",
        tone === "bad" ? "bg-bad/5 border border-bad/25" : "bg-warn/5 border border-warn/25",
      )}
    >
      <AlertTriangle
        className={cn("size-3.5 shrink-0 mt-0.5", tone === "bad" ? "text-bad" : "text-warn")}
      />
      <span>{text}</span>
    </div>
  );
}

function toDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}
