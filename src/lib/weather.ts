// Live weather via Open-Meteo (no API key required).
// https://open-meteo.com/en/docs
import { useEffect, useState } from "react";

export interface DailyForecast {
  date: string; // ISO yyyy-mm-dd
  tMax: number;
  tMin: number;
  precipMm: number;
  precipProb: number;
  windMaxKmh: number;
  code: number;
}

export interface CurrentWeather {
  tempC: number;
  windKmh: number;
  humidity: number;
  code: number;
  isDay: boolean;
}

export interface WeatherData {
  current: CurrentWeather;
  daily: DailyForecast[];
  lat: number;
  lon: number;
  placeLabel?: string;
  fetchedAt: string;
}

const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mostly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Heavy showers",
  82: "Violent showers",
  95: "Thunderstorm",
  96: "Thunderstorm w/ hail",
  99: "Severe thunderstorm",
};

export function describeCode(code: number) {
  return WMO[code] ?? "—";
}

export function weatherEmoji(code: number, isDay = true): string {
  if (code === 0) return isDay ? "☀️" : "🌙";
  if (code <= 2) return isDay ? "🌤️" : "☁️";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code >= 95) return "⛈️";
  return "🌤️";
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,weather_code` +
    `&timezone=auto&forecast_days=7`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Weather API ${res.status}`);
    const j = await res.json();
    const daily: DailyForecast[] = (j.daily?.time ?? []).map((d: string, i: number) => ({
      date: d,
      tMax: j.daily.temperature_2m_max[i],
      tMin: j.daily.temperature_2m_min[i],
      precipMm: j.daily.precipitation_sum[i] ?? 0,
      precipProb: j.daily.precipitation_probability_max[i] ?? 0,
      windMaxKmh: j.daily.wind_speed_10m_max[i] ?? 0,
      code: j.daily.weather_code[i] ?? 0,
    }));
    return {
      current: {
        tempC: j.current.temperature_2m,
        windKmh: j.current.wind_speed_10m,
        humidity: j.current.relative_humidity_2m,
        code: j.current.weather_code,
        isDay: !!j.current.is_day,
      },
      daily,
      lat,
      lon,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

export async function geocodePlace(query: string): Promise<{ lat: number; lon: number; label: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json&country=IN`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const j = await res.json();
  const r = j.results?.[0];
  if (!r) return null;
  return { lat: r.latitude, lon: r.longitude, label: [r.name, r.admin1, r.country].filter(Boolean).join(", ") };
}

interface Coords { lat: number; lon: number; label?: string }

const CACHE_KEY = "predi-farm-x:weather";

function loadCache(): WeatherData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as WeatherData) : null;
  } catch {
    return null;
  }
}

function saveCache(d: WeatherData) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(d));
  } catch {}
}

export function useWeather(coords: Coords | null) {
  const [data, setData] = useState<WeatherData | null>(() => loadCache());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchWeather(coords.lat, coords.lon)
      .then((d) => {
        if (cancelled) return;
        const withLabel = { ...d, placeLabel: coords.label };
        setData(withLabel);
        saveCache(withLabel);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(e.message || "Failed to fetch weather");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [coords?.lat, coords?.lon, reloadKey]);

  return { data, loading, error, refresh: () => setReloadKey((k) => k + 1) };
}

export function useGeolocation() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [status, setStatus] = useState<"idle" | "prompting" | "granted" | "denied" | "unsupported">("idle");
  const [error, setError] = useState<string | null>(null);

  const request = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("prompting");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setStatus("granted");
      },
      (err) => {
        setError(err.message);
        setStatus("denied");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 },
    );
  };

  return { coords, status, error, request };
}
