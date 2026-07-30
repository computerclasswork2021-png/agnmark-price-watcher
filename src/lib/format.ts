import type { Language } from "./profile";

export function formatINR(v: number, lang: Language = "en"): string {
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const sign = v < 0 ? "-" : "";
  return `${sign}₹${Math.abs(Math.round(v)).toLocaleString(locale)}`;
}

export function formatKg(quintals: number, lang: Language = "en"): string {
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const kg = quintals * 100;
  return lang === "hi"
    ? `${quintals.toLocaleString(locale)} क्विंटल (${kg.toLocaleString(locale)} किग्रा)`
    : `${quintals.toLocaleString(locale)} qtl (${kg.toLocaleString(locale)} kg)`;
}

export function formatKm(v: number, lang: Language = "en"): string {
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  return lang === "hi" ? `${v.toLocaleString(locale)} किमी` : `${v.toLocaleString(locale)} km`;
}

export function formatIST(iso: string, lang: Language = "en"): string {
  const d = new Date(iso);
  return (
    d.toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) + " IST"
  );
}

export function formatISTDate(iso: string, lang: Language = "en"): string {
  const d = new Date(iso);
  return d.toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

export function todayIST(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // yyyy-mm-dd
}
