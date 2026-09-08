import { cn } from "@/lib/utils";
import type { AlarmLevel, BatchStatus, RecipeStatus } from "@/lib/mixing/types";
import type { ReactNode } from "react";

export function Panel({ title, right, children, className }: {
  title?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("panel p-4", className)}>
      {(title || right) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="label-caps">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

const BATCH_TEXT: Record<BatchStatus, string> = {
  pending: "รอเริ่ม",
  running: "กำลังผลิต",
  paused: "พักชั่วคราว",
  completed: "เสร็จสมบูรณ์",
  aborted: "ยกเลิก",
  failed: "ล้มเหลว",
};

const BATCH_TONE: Record<BatchStatus, string> = {
  pending: "bg-secondary text-secondary-foreground",
  running: "bg-info/15 text-info border-info/40",
  paused: "bg-warning/15 text-warning border-warning/40",
  completed: "bg-success/15 text-success border-success/40",
  aborted: "bg-destructive/15 text-destructive border-destructive/40",
  failed: "bg-destructive/15 text-destructive border-destructive/40",
};

export function BatchBadge({ status }: { status: BatchStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium", BATCH_TONE[status])}>
      {BATCH_TEXT[status]}
    </span>
  );
}

const RECIPE_TEXT: Record<RecipeStatus, string> = {
  draft: "ร่าง",
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  archived: "เลิกใช้งาน",
};

const RECIPE_TONE: Record<RecipeStatus, string> = {
  draft: "bg-secondary text-secondary-foreground",
  pending: "bg-warning/15 text-warning border-warning/40",
  approved: "bg-success/15 text-success border-success/40",
  archived: "bg-muted text-muted-foreground",
};

export function RecipeBadge({ status }: { status: RecipeStatus }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border border-transparent px-2.5 py-0.5 text-xs font-medium", RECIPE_TONE[status])}>
      {RECIPE_TEXT[status]}
    </span>
  );
}

export const ALARM_TEXT: Record<AlarmLevel, string> = {
  info: "ข้อมูล",
  warning: "เตือน",
  critical: "วิกฤต",
};

export function AlarmBadge({ level }: { level: AlarmLevel }) {
  const tone =
    level === "critical"
      ? "bg-destructive/15 text-destructive"
      : level === "warning"
        ? "bg-warning/15 text-warning"
        : "bg-info/15 text-info";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", tone)}>
      {ALARM_TEXT[level]}
    </span>
  );
}

export function Metric({ label, value, unit, tone = "default", hint }: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "default" | "info" | "success" | "warning" | "danger";
  hint?: string;
}) {
  const toneClass = {
    default: "text-foreground",
    info: "text-info",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  }[tone];
  return (
    <div className="panel p-4">
      <p className="label-caps">{label}</p>
      <p className={cn("hud-value mt-2 text-2xl font-semibold", toneClass)}>
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-muted-foreground">{unit}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Bar({ value, tone = "info" }: { value: number; tone?: "info" | "success" | "warning" | "danger" }) {
  const bg = {
    info: "bg-info",
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-destructive",
  }[tone];
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-[width] duration-500", bg)} style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }} />
    </div>
  );
}

export function fmtTime(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "medium" });
}

export function fmtShort(iso?: string) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
