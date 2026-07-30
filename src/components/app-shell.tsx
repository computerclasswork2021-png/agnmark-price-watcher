import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Home, LineChart, Leaf, ClipboardList, Mic, Sprout } from "lucide-react";
import { useProfile, type Language, initials } from "@/lib/profile";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, hydrated, update } = useProfile();
  const lang: Language = profile?.language ?? "en";

  const setLang = (next: Language) => {
    if (profile) update({ ...profile, language: next });
  };

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground antialiased pb-28">
      <motion.header
        className="sticky top-0 z-30 bg-surface/80 backdrop-blur-md border-b border-border/50 px-4 py-3 flex items-center justify-between"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Link to="/" className="flex items-center gap-2">
          <div className="size-9 bg-brand text-brand-foreground rounded-xl grid place-items-center font-bold text-sm tracking-tight">
            P
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
              {t("brand", lang)}
            </span>
            <span className="text-xs font-medium text-foreground/80">
              {hydrated && profile
                ? `${profile.district || profile.state}, ${profile.state || "India"}`
                : lang === "hi"
                  ? "निर्णय सहायक"
                  : "Decision support"}
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg">
            <button
              onClick={() => setLang("en")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded transition",
                lang === "en"
                  ? "bg-surface shadow-sm ring-1 ring-black/5"
                  : "text-muted-foreground",
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLang("hi")}
              className={cn(
                "px-2.5 py-1 text-xs font-semibold rounded transition",
                lang === "hi"
                  ? "bg-surface shadow-sm ring-1 ring-black/5"
                  : "text-muted-foreground",
              )}
            >
              हिं
            </button>
          </div>
          <Link
            to="/profile"
            className="size-9 rounded-full bg-brand text-brand-foreground grid place-items-center text-xs font-bold ring-1 ring-black/5"
            aria-label={t("profile", lang)}
          >
            {profile ? initials(profile.farmerName) : "P"}
          </Link>
        </div>
      </motion.header>

      <main className="max-w-xl mx-auto px-4 py-6">{children}</main>

      <motion.nav
        className="fixed bottom-0 inset-x-0 z-40 bg-surface/90 backdrop-blur-xl border-t border-border"
        aria-label="Primary"
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="max-w-xl mx-auto grid grid-cols-6">
          <NavItem to="/" active={pathname === "/"} icon={Home} label={t("home", lang)} />
          <NavItem
            to="/mandi"
            active={pathname.startsWith("/mandi")}
            icon={LineChart}
            label={t("mandi", lang)}
          />
          <NavItem to="/soil" active={pathname.startsWith("/soil")} icon={Sprout} label="Soil" />
          <NavItem
            to="/scan"
            active={pathname.startsWith("/scan")}
            icon={Leaf}
            label={t("disease_scan", lang)}
          />
          <NavItem
            to="/tasks"
            active={pathname.startsWith("/tasks")}
            icon={ClipboardList}
            label={t("tasks", lang)}
          />
          <NavItem
            to="/assistant"
            active={pathname.startsWith("/assistant")}
            icon={Mic}
            label={t("ask_assistant", lang)}
          />
        </div>
      </motion.nav>
    </div>
  );
}

function NavItem({
  to,
  active,
  icon: Icon,
  label,
}: {
  to: string;
  active: boolean;
  icon: typeof Home;
  label: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider relative transition-colors",
        active ? "text-brand" : "text-muted-foreground hover:text-foreground/60",
      )}
    >
      <motion.div
        animate={{ scale: active ? 1.1 : 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Icon className="size-4" />
      </motion.div>
      <span className="truncate max-w-[64px]">{label}</span>
      {active && (
        <motion.div
          className="absolute bottom-0 h-0.5 bg-brand rounded-full w-6"
          layoutId="activeNav"
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
    </Link>
  );
}
