import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BookOpen,
  FlaskConical,
  Gauge,
  ListChecks,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useSimState } from "@/lib/mixing/store";

const NAV = [
  { to: "/", label: "หน้าคุมเครื่อง", icon: Gauge },
  { to: "/recipes", label: "สูตรการผสม", icon: FlaskConical },
  { to: "/batches", label: "Batch การผลิต", icon: ListChecks },
  { to: "/alarms", label: "การแจ้งเตือน", icon: AlertTriangle },
  { to: "/reports", label: "รายงาน", icon: BookOpen },
  { to: "/audit", label: "Audit Trail", icon: ShieldCheck },
  { to: "/users", label: "ผู้ใช้และสิทธิ์", icon: Users },
] as const;

export function AppShell({ title, subtitle, actions, children }: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const { alarms, emergency, batches, activeBatchId } = useSimState();
  const unack = alarms.filter((a) => !a.ackBy).length;
  const active = batches.find((b) => b.id === activeBatchId);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-panel/70 backdrop-blur lg:flex">
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          <div className="grid size-9 place-items-center rounded-md bg-primary text-primary-foreground">
            <FlaskConical className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Smart Mixing</p>
            <p className="label-caps">Control System</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              activeProps={{ className: "bg-secondary text-foreground font-medium" }}
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
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          <p className="label-caps mb-1">สถานะสาย</p>
          <p className={emergency ? "text-destructive" : active ? "text-success" : "text-muted-foreground"}>
            {emergency ? "หยุดฉุกเฉิน" : active ? `กำลังผลิต ${active.batchNo}` : "ว่าง / พร้อมผลิต"}
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-4 border-b border-border bg-background/85 px-5 py-4 backdrop-blur">
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold">{title}</h1>
            {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-panel/60 px-3 py-2 lg:hidden">
          {NAV.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-xs text-muted-foreground"
              activeProps={{ className: "bg-secondary text-foreground" }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main className="flex-1 p-5">{children}</main>
      </div>
    </div>
  );
}
