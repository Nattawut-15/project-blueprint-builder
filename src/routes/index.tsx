import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertOctagon, CircleStop, Pause, Play, Plus } from "lucide-react";
import { AppShell } from "@/components/mixing/AppShell";
import { AlarmBadge, Bar, BatchBadge, Metric, Panel, fmtShort } from "@/components/mixing/bits";
import { actions, useSimState } from "@/lib/mixing/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "หน้าคุมเครื่อง — Smart Mixing Control" },
      { name: "description", content: "หน้าจอ Operator ควบคุมและติดตามกระบวนการผสมแบบเรียลไทม์ ทั้งน้ำหนัก ความเร็วรอบ เวลา และอุณหภูมิ" },
      { property: "og:title", content: "หน้าคุมเครื่อง — Smart Mixing Control" },
      { property: "og:description", content: "ควบคุม Batch การผสมแบบเรียลไทม์ พร้อมการแจ้งเตือนและบันทึกการผลิตอัตโนมัติ" },
    ],
  }),
  component: OperatorConsole,
});

function OperatorConsole() {
  const { batches, recipes, alarms, equipment, activeBatchId, emergency } = useSimState();
  const [recipeId, setRecipeId] = useState("R-1001");
  const [abortOpen, setAbortOpen] = useState(false);
  const [reason, setReason] = useState("");

  const active = batches.find((b) => b.id === activeBatchId);
  const pending = batches.filter((b) => b.status === "pending");
  const target = active ?? pending[0] ?? null;
  const currentStep = target?.steps.find((s) => s.no === target.currentStep) ?? null;
  const approved = recipes.filter((r) => r.status === "approved");
  const recentAlarms = alarms.slice(0, 5);
  const eq = (id: string) => equipment.find((e) => e.id === id);
  const doneSteps = target ? target.steps.filter((s) => s.status === "done" || s.status === "deviated").length : 0;

  return (
    <AppShell
      title="หน้าคุมเครื่อง (Operator Console)"
      subtitle="ควบคุมและติดตามกระบวนการผสมแบบเรียลไทม์"
      actions={
        <div className="flex items-center gap-2">
          {emergency ? (
            <button
              onClick={() => actions.resetEmergency()}
              className="rounded-md border border-warning/50 bg-warning/15 px-3 py-2 text-sm font-medium text-warning"
            >
              รีเซ็ตหยุดฉุกเฉิน
            </button>
          ) : (
            <button
              onClick={() => actions.emergencyStop()}
              className="flex items-center gap-2 rounded-md bg-destructive px-3 py-2 text-sm font-semibold text-destructive-foreground"
            >
              <AlertOctagon className="size-4" /> Emergency Stop
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        {emergency && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            ระบบอยู่ในสถานะหยุดฉุกเฉิน — การจ่ายวัตถุดิบและ Mixer ถูกล็อกไว้ (Interlock) ต้องรีเซ็ตก่อนเริ่มผลิตใหม่
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="น้ำหนักในถัง" value={(eq("LC-01")?.value ?? 0).toFixed(2)} unit="kg" tone="info" hint="Load Cell LC-01" />
          <Metric label="ความเร็วรอบ Mixer" value={eq("M-01")?.value ?? 0} unit="RPM" tone={(eq("M-01")?.value ?? 0) > 0 ? "success" : "default"} hint="Mixer M-01 / VFD" />
          <Metric label="อุณหภูมิ" value={(eq("TT-01")?.value ?? 0).toFixed(1)} unit="°C" tone={(eq("TT-01")?.value ?? 0) > 45 ? "warning" : "default"} hint="เซนเซอร์ TT-01" />
          <Metric label="อัตราการไหล" value={(eq("FT-01")?.value ?? 0).toFixed(1)} unit="L/min" hint="Flow Meter FT-01" />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <Panel
            title="ขั้นตอนการผสมปัจจุบัน"
            className={active?.status === "running" ? "scan-live" : undefined}
            right={target ? <BatchBadge status={target.status} /> : null}
          >
            {!target ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                ยังไม่มี Batch ในสาย — เลือกสูตรด้านขวาเพื่อสร้าง Batch ใหม่
              </div>
            ) : (
              <>
                <div className="mb-4 grid gap-3 sm:grid-cols-4">
                  <Field label="Batch No." value={target.batchNo} mono />
                  <Field label="Lot No." value={target.lot} mono />
                  <Field label="สูตร" value={`${target.recipeCode} ${target.recipeVersion}`} />
                  <Field label="Operator" value={target.operator} />
                </div>

                <div className="mb-4 flex items-center gap-3">
                  <Bar value={doneSteps / target.steps.length} tone="success" />
                  <span className="hud-value shrink-0 text-xs text-muted-foreground">
                    {doneSteps}/{target.steps.length} ขั้นตอน
                  </span>
                </div>

                {currentStep && target.status !== "completed" && (
                  <div className="mb-4 rounded-md border border-info/40 bg-info/10 p-3 text-sm">
                    <p className="label-caps mb-1">คำแนะนำขั้นตอนที่ {currentStep.no}</p>
                    <p className="font-medium">{currentStep.action}</p>
                    <p className="mt-1 text-muted-foreground">
                      ค่าเป้าหมาย {currentStep.target} {currentStep.unit}
                      {currentStep.tolerance ? ` (Tolerance ±${currentStep.tolerance} ${currentStep.unit})` : ""}
                    </p>
                  </div>
                )}

                <ol className="space-y-2">
                  {target.steps.map((s) => (
                    <li
                      key={s.no}
                      className={cn(
                        "rounded-md border border-border/70 bg-card/60 p-3",
                        s.no === target.currentStep && target.status === "running" && "border-info/60 bg-info/5",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="hud-value grid size-6 shrink-0 place-items-center rounded bg-secondary text-xs">{s.no}</span>
                        <span className="min-w-0 flex-1 truncate text-sm">{s.action}</span>
                        <span className="hud-value text-sm">
                          <span className={cn(s.status === "deviated" ? "text-destructive" : "text-foreground")}>
                            {s.type === "end" ? "-" : s.actual.toFixed(2)}
                          </span>
                          <span className="text-muted-foreground"> / {s.type === "end" ? "-" : s.target} {s.unit}</span>
                        </span>
                        <StepState status={s.status} />
                      </div>
                      {s.type !== "end" && <div className="mt-2"><Bar value={s.progress} tone={s.status === "deviated" ? "danger" : s.status === "done" ? "success" : "info"} /></div>}
                    </li>
                  ))}
                </ol>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    disabled={emergency || target.status === "running" || target.status === "completed" || target.status === "aborted"}
                    onClick={() => actions.start(target.id)}
                    className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-40"
                  >
                    <Play className="size-4" /> {target.status === "paused" ? "ทำงานต่อ" : "เริ่ม Batch"}
                  </button>
                  <button
                    disabled={target.status !== "running"}
                    onClick={() => actions.pause(target.id)}
                    className="flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium disabled:opacity-40"
                  >
                    <Pause className="size-4" /> พัก
                  </button>
                  <button
                    disabled={target.status === "completed" || target.status === "aborted"}
                    onClick={() => setAbortOpen(true)}
                    className="flex items-center gap-2 rounded-md border border-destructive/50 px-4 py-2 text-sm font-medium text-destructive disabled:opacity-40"
                  >
                    <CircleStop className="size-4" /> ยกเลิก Batch
                  </button>
                  <Link
                    to="/batches/$batchId"
                    params={{ batchId: target.id }}
                    className="ml-auto self-center text-sm text-info underline-offset-4 hover:underline"
                  >
                    ดู Batch Record
                  </Link>
                </div>

                {abortOpen && (
                  <div className="mt-3 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <p className="mb-2 text-sm font-medium">ระบุเหตุผลการยกเลิก (บันทึกลง Audit Trail)</p>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="เช่น วัตถุดิบไม่พร้อม / อุปกรณ์ผิดปกติ"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        disabled={!reason.trim()}
                        onClick={() => {
                          actions.abort(target.id, reason.trim(), target.operator);
                          setReason("");
                          setAbortOpen(false);
                        }}
                        className="rounded-md bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground disabled:opacity-40"
                      >
                        ยืนยันยกเลิก
                      </button>
                      <button onClick={() => setAbortOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-sm">
                        ปิด
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Panel>

          <div className="space-y-5">
            <Panel title="สร้าง Batch ใหม่">
              <label className="label-caps mb-1 block">เลือกสูตรที่อนุมัติแล้ว</label>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {approved.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} {r.version} — {r.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => actions.createBatch(recipeId, "สมชาย ผลิตดี")}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
              >
                <Plus className="size-4" /> สร้าง Batch
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                ระบบจะออก Batch ID และ Lot No. อัตโนมัติ พร้อมตรวจความพร้อมของอุปกรณ์ก่อนเริ่มผลิต
              </p>
            </Panel>

            <Panel title="สถานะอุปกรณ์">
              <ul className="space-y-2">
                {equipment.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-md bg-card/60 px-3 py-2 text-sm">
                    <span className={cn("size-2 rounded-full", e.status === "ok" ? "bg-success" : e.status === "warn" ? "bg-warning" : "bg-destructive")} />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <span className="hud-value text-muted-foreground">{e.id}</span>
                    <span className="hud-value w-20 text-right">{e.value} {e.unit}</span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="การแจ้งเตือนล่าสุด" right={<Link to="/alarms" className="text-xs text-info hover:underline">ดูทั้งหมด</Link>}>
              <ul className="space-y-2">
                {recentAlarms.map((a) => (
                  <li key={a.id} className="rounded-md bg-card/60 p-3 text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <AlarmBadge level={a.level} />
                      <span className="hud-value text-xs text-muted-foreground">{fmtShort(a.at)}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{a.source}</span>
                    </div>
                    <p className="text-muted-foreground">{a.message}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-md bg-card/60 px-3 py-2">
      <p className="label-caps">{label}</p>
      <p className={cn("mt-0.5 truncate text-sm", mono && "hud-value")}>{value}</p>
    </div>
  );
}

function StepState({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    waiting: ["รอ", "text-muted-foreground"],
    running: ["กำลังทำงาน", "text-info"],
    done: ["ผ่าน", "text-success"],
    deviated: ["เบี่ยงเบน", "text-destructive"],
  };
  const [text, tone] = map[status] ?? ["-", ""];
  return <span className={cn("w-24 text-right text-xs font-medium", tone)}>{text}</span>;
}
