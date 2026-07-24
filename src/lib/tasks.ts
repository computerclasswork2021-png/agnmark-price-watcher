import { useEffect, useState } from "react";
import { todayIST } from "./format";

export type TaskSource = "ai" | "user";
export interface FarmTask {
  id: string;
  title: string;
  source: TaskSource;
  createdAt: string;
  doneOn?: string; // yyyy-mm-dd IST
  priority?: "high" | "normal" | "low";
}

const KEY = "predi-farm-x:tasks";

export function loadTasks(): FarmTask[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FarmTask[]) : [];
  } catch {
    return [];
  }
}

export function saveTasks(tasks: FarmTask[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(tasks));
  window.dispatchEvent(new Event("predi-farm-x:tasks-change"));
}

export function mergeAiTasks(aiTitles: string[], existing: FarmTask[]): FarmTask[] {
  const now = new Date().toISOString();
  const existingAiTitles = new Set(existing.filter((t) => t.source === "ai").map((t) => t.title));
  const newOnes: FarmTask[] = aiTitles
    .filter((t) => t && !existingAiTitles.has(t))
    .map((title, i) => ({
      id: `ai-${Date.now()}-${i}`,
      title,
      source: "ai" as const,
      createdAt: now,
      priority: "normal" as const,
    }));
  return [...existing, ...newOnes];
}

export function useTasks() {
  const [tasks, setTasks] = useState<FarmTask[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setTasks(loadTasks());
    setHydrated(true);
    const refresh = () => setTasks(loadTasks());
    window.addEventListener("predi-farm-x:tasks-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("predi-farm-x:tasks-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return {
    tasks,
    hydrated,
    add: (title: string) => {
      const t: FarmTask = {
        id: `user-${Date.now()}`,
        title,
        source: "user",
        createdAt: new Date().toISOString(),
        priority: "normal",
      };
      const next = [t, ...tasks];
      saveTasks(next);
      setTasks(next);
    },
    remove: (id: string) => {
      const next = tasks.filter((t) => t.id !== id);
      saveTasks(next);
      setTasks(next);
    },
    toggleDone: (id: string) => {
      const today = todayIST();
      const next = tasks.map((t) =>
        t.id === id ? { ...t, doneOn: t.doneOn === today ? undefined : today } : t,
      );
      saveTasks(next);
      setTasks(next);
    },
    seedAi: (titles: string[]) => {
      const next = mergeAiTasks(titles, tasks);
      saveTasks(next);
      setTasks(next);
    },
    resetAi: () => {
      const next = tasks.filter((t) => t.source !== "ai");
      saveTasks(next);
      setTasks(next);
    },
  };
}

export function isDoneToday(task: FarmTask): boolean {
  return task.doneOn === todayIST();
}
