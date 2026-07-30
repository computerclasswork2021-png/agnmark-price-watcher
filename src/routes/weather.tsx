import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, RefreshCw, Search, Wind, Droplets, CloudRain } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/lib/profile";
import {
  describeCode,
  geocodePlace,
  useWeather,
  weatherEmoji,
  type WeatherData,
} from "@/lib/weather";
import { t } from "@/lib/i18n";
import { GlassCard } from "@/components/ui/glass-card";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/ui/animations";

export const Route = createFileRoute("/weather")({
  head: () => ({
    meta: [
      { title: "Weather — PREDI-FARM X" },
      {
        name: "description",
        content: "Live 7-day forecast from Open-Meteo tuned for harvest decisions.",
      },
      { property: "og:title", content: "Weather — PREDI-FARM X" },
      { property: "og:description", content: "Real 7-day forecast." },
    ],
  }),
  component: WeatherPage,
});

interface Coords {
  lat: number;
  lon: number;
  label?: string;
}

function WeatherPage() {
  const { profile } = useProfile();
  const lang = profile?.language ?? "en";
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoErr, setGeoErr] = useState<string | null>(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [searchBusy, setSearchBusy] = useState(false);

  useEffect(() => {
    if (coords || !profile) return;
    if (profile.lat && profile.lon) {
      setCoords({
        lat: profile.lat,
        lon: profile.lon,
        label: `${profile.district || profile.village}, ${profile.state}`,
      });
      return;
    }
    const q = [profile.district, profile.state].filter(Boolean).join(", ");
    if (!q) return;
    let cancelled = false;
    geocodePlace(q).then((r) => {
      if (!cancelled && r) setCoords({ lat: r.lat, lon: r.lon, label: r.label });
    });
    return () => {
      cancelled = true;
    };
  }, [profile?.state, profile?.district, profile?.lat, profile?.lon, coords, profile]);

  const { data, loading, error, refresh } = useWeather(coords);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoErr(lang === "hi" ? "GPS समर्थित नहीं" : "Geolocation not supported");
      return;
    }
    setGeoBusy(true);
    setGeoErr(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: lang === "hi" ? "मेरा स्थान" : "My location",
        });
        setGeoBusy(false);
      },
      (err) => {
        setGeoErr(err.message);
        setGeoBusy(false);
      },
      { timeout: 8000 },
    );
  };

  const runSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchBusy(true);
    const r = await geocodePlace(query.trim());
    setSearchBusy(false);
    if (r) setCoords({ lat: r.lat, lon: r.lon, label: r.label });
    else setGeoErr(`Not found: "${query}"`);
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("weather", lang)}</h1>
          <p className="text-sm text-muted-foreground">
            {lang === "hi"
              ? "Open-Meteo से लाइव 7-दिवसीय पूर्वानुमान।"
              : "Live 7-day forecast from Open-Meteo."}
          </p>
        </div>

        <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-4 flex flex-col gap-3">
          <form onSubmit={runSearch} className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === "hi" ? "गांव, कस्बा या जिला खोजें" : "Search village, town or district"
                }
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-muted/40 ring-1 ring-border text-sm outline-none focus:ring-brand"
              />
            </div>
            <button
              type="submit"
              disabled={searchBusy || !query.trim()}
              className="text-xs font-semibold px-3 rounded-lg bg-foreground text-background disabled:opacity-50"
            >
              {searchBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : lang === "hi" ? (
                "जाओ"
              ) : (
                "Go"
              )}
            </button>
          </form>
          <div className="flex items-center justify-between gap-2 text-xs">
            <button
              onClick={useMyLocation}
              disabled={geoBusy}
              className="inline-flex items-center gap-1.5 font-semibold text-brand"
            >
              {geoBusy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <MapPin className="size-3.5" />
              )}
              {lang === "hi" ? "मेरा स्थान" : "Use my location"}
            </button>
            {coords && (
              <span className="text-muted-foreground truncate max-w-[60%]">
                {coords.label ?? `${coords.lat.toFixed(2)}, ${coords.lon.toFixed(2)}`}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading || !coords}
              className="inline-flex items-center gap-1 font-semibold text-muted-foreground disabled:opacity-50"
            >
              <RefreshCw className={loading ? "size-3 animate-spin" : "size-3"} />{" "}
              {t("refresh", lang)}
            </button>
          </div>
          {geoErr && <div className="text-xs text-bad">{geoErr}</div>}
        </div>

        {!coords && !loading && (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {lang === "hi"
              ? "स्थान चुनें या ऑनबोर्डिंग पूरी करें।"
              : "Set your location above or complete onboarding."}
          </div>
        )}

        {loading && !data && <ForecastSkeleton />}
        {error && !data && (
          <div className="rounded-xl border border-bad/20 bg-bad/10 text-bad text-sm p-3">
            {lang === "hi" ? "मौसम सेवा तक नहीं पहुंचे: " : "Couldn't reach weather: "}
            {error}
          </div>
        )}

        {data && <ForecastView data={data} stale={loading} lang={lang} />}
      </div>
    </AppShell>
  );
}

function ForecastSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="h-28 bg-surface ring-1 ring-black/5 rounded-2xl" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 bg-surface ring-1 ring-black/5 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ForecastView({
  data,
  stale,
  lang,
}: {
  data: WeatherData;
  stale: boolean;
  lang: "en" | "hi";
}) {
  const today = data.daily[0];
  const rainAlert = useMemo(
    () => data.daily.slice(0, 3).some((d) => d.precipProb >= 60 || d.precipMm >= 10),
    [data],
  );
  const localeName = lang === "hi" ? "hi-IN" : "en-IN";

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-5 flex items-center gap-4">
        <div className="text-5xl leading-none">
          {weatherEmoji(data.current.code, data.current.isDay)}
        </div>
        <div className="flex-1">
          <div className="text-3xl font-semibold">{Math.round(data.current.tempC)}°C</div>
          <div className="text-sm text-muted-foreground">{describeCode(data.current.code)}</div>
          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Wind className="size-3" /> {Math.round(data.current.windKmh)} km/h
            </span>
            <span className="inline-flex items-center gap-1">
              <Droplets className="size-3" /> {Math.round(data.current.humidity)}%
            </span>
            {today && (
              <span className="inline-flex items-center gap-1">
                <CloudRain className="size-3" /> {Math.round(today.precipProb)}%
              </span>
            )}
          </div>
        </div>
        {stale && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>

      {rainAlert && (
        <div className="rounded-xl border border-warn/20 bg-warn/10 text-warn text-sm p-3">
          {lang === "hi"
            ? "⚠️ अगले 3 दिनों में बारिश की संभावना — कटाई/भंडारण तदनुसार तय करें।"
            : "⚠️ Rain likely in next 3 days — plan harvest / storage."}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {data.daily.map((d) => (
          <div key={d.date} className="bg-surface ring-1 ring-black/5 rounded-xl p-3 text-center">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {new Date(d.date).toLocaleDateString(localeName, {
                weekday: "short",
                timeZone: "Asia/Kolkata",
              })}
            </div>
            <div className="text-2xl leading-tight my-1">{weatherEmoji(d.code)}</div>
            <div className="text-sm font-semibold">
              {Math.round(d.tMax)}°
              <span className="text-muted-foreground font-normal"> / {Math.round(d.tMin)}°</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              💧 {Math.round(d.precipProb)}%
            </div>
            <div className="text-[10px] text-muted-foreground">{d.precipMm.toFixed(1)} mm</div>
          </div>
        ))}
      </div>

      <div className="text-[10px] text-muted-foreground text-right">
        Open-Meteo ·{" "}
        {new Date(data.fetchedAt).toLocaleTimeString(localeName, { timeZone: "Asia/Kolkata" })} IST
      </div>
    </div>
  );
}
