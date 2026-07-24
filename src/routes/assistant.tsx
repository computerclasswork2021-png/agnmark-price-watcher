import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Mic, Loader2, Send, Volume2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { useProfile } from "@/lib/profile";
import { askAssistant } from "@/lib/assistant.functions";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Voice Assistant — PREDI-FARM X" },
      { name: "description", content: "Ask farming questions in Hindi or English by voice or text." },
      { property: "og:title", content: "Voice Assistant — PREDI-FARM X" },
      { property: "og:description", content: "Bilingual assistant for Indian farmers." },
    ],
  }),
  component: AssistantPage,
});

type Msg = { role: "user" | "assistant"; text: string };

function AssistantPage() {
  const { profile } = useProfile();
  const lang = profile?.language ?? "en";
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const mutation = useMutation({
    mutationFn: async (q: string) =>
      askAssistant({
        data: {
          question: q,
          language: lang,
          incomeTier: profile?.incomeTier ?? "middle",
          context: profile
            ? `Farmer ${profile.farmerName}, ${profile.crop} on ${profile.farmSizeAcres} acres in ${profile.district}, ${profile.state}. Income tier: ${profile.incomeTier}. Irrigation: ${profile.irrigation}.`
            : "",
        },
      }),
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
      speak(res.answer, lang);
    },
  });

  const submit = (text: string) => {
    const q = text.trim();
    if (!q) return;
    setMessages((m) => [...m, { role: "user", text: q }]);
    setQuestion("");
    mutation.mutate(q);
  };

  const toggleListen = () => {
    const SR = (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SR) { alert(lang === "hi" ? "इस ब्राउज़र में वॉइस समर्थित नहीं" : "Voice not supported"); return; }
    if (listening) { recognitionRef.current?.stop(); setListening(false); return; }
    const rec = new SR();
    rec.lang = lang === "hi" ? "hi-IN" : "en-IN";
    rec.interimResults = false; rec.maxAlternatives = 1;
    rec.onresult = (e: any) => { const text = e.results[0][0].transcript as string; setListening(false); submit(text); };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec; setListening(true); rec.start();
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("ask_assistant", lang)}</h1>
          <p className="text-sm text-muted-foreground">
            {lang === "hi" ? "वॉइस या टेक्स्ट से हिंदी में पूछें।" : "Ask by voice or text."}
          </p>
        </div>

        <div className="flex flex-col gap-3 min-h-[240px]">
          {messages.length === 0 && (
            <div className="bg-surface ring-1 ring-black/5 rounded-2xl p-4 text-sm text-muted-foreground">
              {t("try_examples", lang)}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`rounded-2xl p-3 max-w-[85%] ${m.role === "user" ? "bg-brand text-brand-foreground self-end" : "bg-surface ring-1 ring-black/5 self-start"}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>
              {m.role === "assistant" && (
                <button onClick={() => speak(m.text, lang)} className="mt-2 text-[10px] font-bold uppercase tracking-wider text-brand inline-flex items-center gap-1">
                  <Volume2 className="size-3" /> {t("speak", lang)}
                </button>
              )}
            </div>
          ))}
          {mutation.isPending && <div className="text-sm text-muted-foreground inline-flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> {t("thinking", lang)}</div>}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); submit(question); }}
          className="sticky bottom-24 bg-surface ring-1 ring-black/5 rounded-full flex items-center gap-2 p-1 shadow-lg">
          <button type="button" onClick={toggleListen}
            className={`size-11 rounded-full grid place-items-center shrink-0 ${listening ? "bg-bad text-white animate-pulse" : "bg-brand text-brand-foreground"}`}>
            <Mic className="size-5" />
          </button>
          <input value={question} onChange={(e) => setQuestion(e.target.value)}
            placeholder={t("ask_placeholder", lang)} className="flex-1 bg-transparent text-sm px-2 focus:outline-none" />
          <button type="submit" disabled={!question.trim() || mutation.isPending}
            className="size-10 rounded-full bg-foreground text-background grid place-items-center disabled:opacity-40">
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </AppShell>
  );
}

function speak(text: string, lang: "en" | "hi") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "hi" ? "hi-IN" : "en-IN";
  u.rate = 0.95;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(u);
}
