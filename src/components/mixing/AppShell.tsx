import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  FlaskConical,
  Gauge,
  ListChecks,
  Scale,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useSimState } from "@/lib/mixing/store";

const NAV = [
  { to: "/", label: "หน้าคุมเครื่อง", icon: Gauge },
  { to: "/specific-gravity", label: "ค่า ถ.พ", icon: Scale },
  { to: "/recipes", label: "สูตรการผสม", icon: FlaskConical },
  { to: "/batches", label: "Batch การผลิต", icon: ListChecks },
  { to: "/alarms", label: "การแจ้งเตือน", icon: AlertTriangle },
  { to: "/reports", label: "รายงาน", icon: BookOpen },
  { to: "/audit", label: "Audit Trail", icon: ShieldCheck },
  { to: "/users", label: "ผู้ใช้และสิทธิ์", icon: Users },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { alarms, emergency, batches, activeBatchId } = useSimState();
  const unack = alarms.filter((a) => !a.ackBy).length;
  const active = batches.find((b) => b.id === activeBatchId);

  return (
    <div className="mx-auto flex min-h-screen max-w-[1440px] overflow-hidden rounded-none border-border bg-background text-foreground xl:my-6 xl:min-h-[calc(100vh-3rem)] xl:rounded-2xl xl:border">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-[oklch(0.13_0.026_202)] shadow-2xl lg:flex">
        <div className="flex items-center gap-3 border-b border-border/70 px-5 py-5">
          <div className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_28px_oklch(0.77_0.205_151_/_0.36)]">
            <FlaskConical className="size-5" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight tracking-tight">Smart Mixing</p>
            <p className="label-caps">Control System</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground"
              activeProps={{
                className:
                  "bg-secondary text-foreground font-medium shadow-[inset_3px_0_0_var(--primary)]",
              }}
            >
              <Icon className="size-4" />
              <span>{label}</span>
              {to === "/alarms" && unack > 0 && (
                <span className="ml-auto rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                  {unack}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border/70 bg-background/40 p-4 text-xs text-muted-foreground">
          <p className="label-caps mb-1">สถานะสาย</p>
          <p
            className={
              emergency ? "text-destructive" : active ? "text-success" : "text-muted-foreground"
            }
          >
            {emergency
              ? "หยุดฉุกเฉิน"
              : active
                ? `กำลังผลิต ${active.batchNo}`
                : "ว่าง / พร้อมผลิต"}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b border-border bg-background/85 px-6 py-4 backdrop-blur-xl">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-panel px-3 py-2 shadow-sm lg:hidden">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs text-muted-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
