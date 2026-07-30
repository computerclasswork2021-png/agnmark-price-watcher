import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  interactive?: boolean;
}

/**
 * GlassCard: Premium glass-morphism component with frosted effect
 */
export function GlassCard({
  children,
  className,
  hover = false,
  interactive = false,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-2xl backdrop-blur-md",
        "bg-white/70 dark:bg-slate-900/60",
        "border border-white/30 dark:border-white/10",
        "shadow-lg dark:shadow-2xl",
        hover && "hover:bg-white/80 dark:hover:bg-slate-900/70 transition-all duration-300",
        interactive && "cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * GradientCard: Card with premium gradient border
 */
export function GradientCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-px overflow-hidden",
        "before:absolute before:inset-0 before:-z-10",
        "before:bg-gradient-to-r before:from-green-500 before:via-green-500/20 before:to-orange-500/30",
        "before:rounded-2xl",
        className,
      )}
    >
      <div className="rounded-2xl bg-white dark:bg-slate-900 p-6">{children}</div>
    </div>
  );
}

/**
 * AnimatedBorder: Component with animated gradient border
 */
export function AnimatedBorder({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden",
        "before:absolute before:inset-0 before:-z-10 before:rounded-2xl",
        "before:bg-gradient-to-r before:from-green-500 before:to-orange-500",
        "before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300",
        "after:absolute after:inset-0 after:-z-10 after:rounded-2xl",
        "after:bg-white dark:after:bg-slate-900",
        className,
      )}
    >
      {children}
    </div>
  );
}
