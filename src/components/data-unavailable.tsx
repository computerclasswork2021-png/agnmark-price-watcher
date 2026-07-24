import { CloudOff } from "lucide-react";
import type { ReactNode } from "react";

export function DataUnavailable({
  title = "Data Currently Unavailable",
  reason,
  action,
}: {
  title?: string;
  reason?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-border rounded-2xl p-6 bg-surface/40 flex flex-col items-center text-center gap-2">
      <div className="size-10 rounded-full bg-muted grid place-items-center">
        <CloudOff className="size-5 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-bold text-foreground">{title}</h3>
      {reason && <p className="text-xs text-muted-foreground max-w-[36ch]">{reason}</p>}
      {action}
    </div>
  );
}
