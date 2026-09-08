import { createFileRoute, Link } from "@tanstack/react-router";
import type { CSSProperties } from "react";
import { useState } from "react";
import { AlertOctagon, CircleStop, Cpu, Pause, Play, Plus, Sparkles } from "lucide-react";
import { AppShell } from "@/components/mixing/AppShell";
import { AlarmBadge, Bar, BatchBadge, Metric, Panel, fmtShort } from "@/components/mixing/bits";
import { actions, useSimState, type SimState } from "@/lib/mixing/store";
import { cn } from "@/lib/utils";

type TankStatusKey = "running" | "stopped" | "waiting" | "fault" | "maintenance";

const TANK_STATUS: Record<
  TankStatusKey,
  { label: string; detail: string; color: string; tone: string }
> = {
  running: {
    label: "กำลังทำงาน",
    detail: "ใบกวนและระบบจ่ายวัตถุดิบกำลังทำงาน",
    color: "oklch(0.77 0.205 151)",
    tone: "text-primary",
  },
  stopped: {
    label: "หยุดเครื่อง",
    detail: "ระบบถูกหยุดหรือถูกล็อกด้วย Emergency Stop",
    color: "oklch(0.66 0.21 25)",
    tone: "text-destructive",
  },
  waiting: {
    label: "รอการผลิต",
    detail: "พร้อมเริ่ม Batch แต่ยังไม่เดินเครื่อง",
    color: "oklch(0.8 0.17 86)",
    tone: "text-warning",
  },
  fault: {
    label: "เครื่องจักรมีปัญหา",
    detail: "พบอุปกรณ์สถานะ fault ต้องตรวจสอบทันที",
    color: "oklch(0.66 0.21 25)",
    tone: "text-destructive",
  },
  maintenance: {
    label: "อยู่ระหว่างการซ่อมบำรุง",
    detail: "อุปกรณ์บางรายการอยู่ในสถานะ warn/maintenance",
    color: "oklch(0.685 0.169 237)",
    tone: "text-info",
  },
};

function getTankStatus({
  emergency,
  active,
  pending,
  equipment,
}: {
  emergency: boolean;
  active: SimState["batches"][number] | undefined;
  pending: SimState["batches"];
  equipment: SimState["equipment"];
}): TankStatusKey {
  if (equipment.some((e) => e.status === "fault")) return "fault";
  if (equipment.some((e) => e.status === "warn")) return "maintenance";
  if (emergency || active?.status === "paused") return "stopped";
  if (active?.status === "running") return "running";
  if (pending.length > 0) return "waiting";
  return "waiting";
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "หน้าคุมเครื่อง — Smart Mixing Control" },
      {
        name: "description",
        content:
          "หน้าจอ Operator ควบคุมและติดตามกระบวนการผสมแบบเรียลไทม์ ทั้งน้ำหนัก ความเร็วรอบ เวลา และอุณหภูมิ",
      },
      { property: "og:title", content: "หน้าคุมเครื่อง — Smart Mixing Control" },
      {
        property: "og:description",
        content: "ควบคุม Batch การผสมแบบเรียลไทม์ พร้อมการแจ้งเตือนและบันทึกการผลิตอัตโนมัติ",
      },
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
  const tankStatusKey = getTankStatus({ emergency, active, pending, equipment });
  const tankStatus = TANK_STATUS[tankStatusKey];
  const currentStep = target?.steps.find((s) => s.no === target.currentStep) ?? null;
  const approved = recipes.filter((r) => r.status === "approved");
  const recentAlarms = alarms.slice(0, 5);
  const eq = (id: string) => equipment.find((e) => e.id === id);
  const runningEquipment = equipment.filter((e) => e.value > 0).length;
  const doneSteps = target
    ? target.steps.filter((s) => s.status === "done" || s.status === "deviated").length
    : 0;

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
      <div className="space-y-6">
        {emergency && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            ระบบอยู่ในสถานะหยุดฉุกเฉิน — การจ่ายวัตถุดิบและ Mixer ถูกล็อกไว้ (Interlock)
            ต้องรีเซ็ตก่อนเริ่มผลิตใหม่
          </div>
        )}

        <section className="holo-card rounded-2xl p-6 lg:p-7">
          <div className="futuristic-grid pointer-events-none absolute inset-0 opacity-80" />
          <div className="pointer-events-none absolute -right-16 -top-16 size-52 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="size-3.5" /> FUTURISTIC PRODUCTION HUB
              </div>
              <h2 className="max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-5xl">
                Project Dashboard สำหรับควบคุมการผสมแบบ 3D Realtime
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                รวมสถานะ Batch, สูตรผลิต, เครื่องจักร และ Alarm ไว้ในหน้าจอเดียว พร้อมมุมมองแบบ
                modern 3D UI ที่อ่านง่ายและเป็นระบบ
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => target && actions.start(target.id)}
                  disabled={
                    !target ||
                    emergency ||
                    target.status === "running" ||
                    target.status === "completed" ||
                    target.status === "aborted"
                  }
                  className="glow-button inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground disabled:opacity-40"
                >
                  <Play className="size-4" /> Start Production
                </button>
                <Link
                  to="/specific-gravity"
                  className="inline-flex items-center gap-2 rounded-xl border border-primary/25 bg-secondary/70 px-5 py-3 text-sm font-semibold text-foreground hover:bg-secondary"
                >
                  ดูค่า ถ.พ
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="holo-surface rounded-2xl p-4">
                <p className="label-caps">Active Batch</p>
                <p className="hud-value mt-2 text-2xl font-semibold text-primary">
                  {active ? active.batchNo : target ? target.batchNo : "READY"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {active ? active.product : "รอเริ่มสายผลิต"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="holo-surface rounded-2xl p-4">
                  <p className="label-caps">Machines</p>
                  <p className="hud-value mt-2 text-2xl font-semibold">
                    {runningEquipment}/{equipment.length}
                  </p>
                </div>
                <div className="holo-surface rounded-2xl p-4">
                  <p className="label-caps">Recipes</p>
                  <p className="hud-value mt-2 text-2xl font-semibold">{approved.length}</p>
                </div>
              </div>
              <div className="holo-surface flex items-center gap-3 rounded-2xl p-4">
                <div className="grid size-11 place-items-center rounded-xl bg-primary/15 text-primary">
                  <Cpu className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">System status</p>
                  <p className={cn("text-xs", emergency ? "text-destructive" : "text-primary")}>
                    {emergency ? "Emergency locked" : "Optimal / Ready"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <Panel title="ภาพจำลองกระบวนการผสมแบบ 3D" className="holo-surface">
          <div className="grid gap-6 xl:grid-cols-[1fr_0.78fr] xl:items-center">
            <div className="relative min-h-[360px] overflow-hidden rounded-2xl border border-primary/15 bg-background/50 p-6">
              <div className="futuristic-grid pointer-events-none absolute inset-0 opacity-60" />
              <div className="pointer-events-none absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
              <div className="relative mx-auto mt-8 h-72 max-w-md">
                <div className="tank-3d absolute left-1/2 top-24 h-48 w-64 -translate-x-1/2">
                  <div className="absolute inset-x-8 -top-7 h-14 rounded-[50%] border border-primary/35 bg-[linear-gradient(145deg,oklch(0.34_0.04_202),oklch(0.16_0.026_202))] shadow-[0_18px_45px_oklch(0_0_0_/_0.35)]" />
                  <div className="absolute inset-x-8 bottom-0 h-14 rounded-[50%] border border-primary/20 bg-[oklch(0.12_0.026_202)]" />
                  <div className="absolute inset-x-8 top-0 h-40 rounded-b-[45%] border-x border-primary/25 bg-[linear-gradient(90deg,oklch(0.19_0.028_202),oklch(0.3_0.045_202),oklch(0.15_0.026_202))]" />
                  <div
                    className={cn(
                      "absolute inset-x-12 top-8 h-24 rounded-[45%] border border-primary/30 bg-primary/35",
                      tankStatusKey === "running" &&
                        "animate-[liquidPulse_1.8s_ease-in-out_infinite]",
                    )}
                  />
                  <div className="absolute left-1/2 top-[-46px] h-36 w-3 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,oklch(0.82_0.02_202),oklch(0.28_0.02_202))]" />
                  <div
                    className={cn(
                      "absolute left-1/2 top-10 h-24 w-24 -translate-x-1/2 rounded-full border-4 border-primary/60 border-t-transparent",
                      tankStatusKey === "running" && "animate-[mixOrbit_1.2s_linear_infinite]",
                    )}
                  />
                  <div className="absolute left-1/2 top-20 h-2 w-36 -translate-x-1/2 rounded-full bg-primary/50" />
                </div>
                <div
                  className="absolute bottom-2 left-1/2 size-28 -translate-x-1/2 rounded-full opacity-50 blur-2xl animate-[statusGlow_2s_ease-in-out_infinite]"
                  style={{ "--status-color": tankStatus.color } as CSSProperties}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-primary/20 bg-card/70 p-5">
                <p className="label-caps">สถานะถังผสม</p>
                <div className="mt-3 flex items-center gap-3">
                  <span
                    className="size-3 rounded-full animate-pulse"
                    style={{ backgroundColor: tankStatus.color }}
                  />
                  <p className={cn("text-2xl font-bold", tankStatus.tone)}>{tankStatus.label}</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{tankStatus.detail}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field label="Batch" value={target?.batchNo ?? "รอสร้าง Batch"} mono />
                  <Field label="Step" value={currentStep?.action ?? "ยังไม่เริ่มขั้นตอน"} />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(TANK_STATUS) as TankStatusKey[]).map((key) => {
                  const item = TANK_STATUS[key];
                  return (
                    <div
                      key={key}
                      className={cn(
                        "rounded-xl border bg-card/55 p-3 text-sm",
                        key === tankStatusKey
                          ? "border-primary/60 shadow-[0_0_24px_oklch(0.77_0.205_151_/_0.16)]"
                          : "border-border/70",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-semibold">{item.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            label="น้ำหนักในถัง"
            value={(eq("LC-01")?.value ?? 0).toFixed(2)}
            unit="kg"
            tone="info"
            hint="Load Cell LC-01"
          />
          <Metric
            label="ความเร็วรอบ Mixer"
            value={eq("M-01")?.value ?? 0}
            unit="RPM"
            tone={(eq("M-01")?.value ?? 0) > 0 ? "success" : "default"}
            hint="Mixer M-01 / VFD"
          />
          <Metric
            label="อุณหภูมิ"
            value={(eq("TT-01")?.value ?? 0).toFixed(1)}
            unit="°C"
            tone={(eq("TT-01")?.value ?? 0) > 45 ? "warning" : "default"}
            hint="เซนเซอร์ TT-01"
          />
          <Metric
            label="อัตราการไหล"
            value={(eq("FT-01")?.value ?? 0).toFixed(1)}
            unit="L/min"
            hint="Flow Meter FT-01"
          />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            <Panel
              title="ขั้นตอนการผสมปัจจุบัน"
              className={cn("holo-surface", active?.status === "running" && "scan-live")}
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
                    <div className="mb-4 rounded-xl border border-info/40 bg-info/10 p-4 text-sm shadow-[inset_0_1px_0_oklch(1_0_0_/_0.06)]">
                      <p className="label-caps mb-1">คำแนะนำขั้นตอนที่ {currentStep.no}</p>
                      <p className="font-medium">{currentStep.action}</p>
                      <p className="mt-1 text-muted-foreground">
                        ค่าเป้าหมาย {currentStep.target} {currentStep.unit}
                        {currentStep.tolerance
                          ? ` (Tolerance ±${currentStep.tolerance} ${currentStep.unit})`
                          : ""}
                      </p>
                    </div>
                  )}

                  <ol className="space-y-2">
                    {target.steps.map((s) => (
                      <li
                        key={s.no}
                        className={cn(
                          "holo-surface rounded-xl p-3 transition-transform duration-300 hover:-translate-y-0.5",
                          s.no === target.currentStep &&
                            target.status === "running" &&
                            "border-info/60 bg-info/10",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="hud-value grid size-6 shrink-0 place-items-center rounded bg-secondary text-xs">
                            {s.no}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm">{s.action}</span>
                          <span className="hud-value text-sm">
                            <span
                              className={cn(
                                s.status === "deviated" ? "text-destructive" : "text-foreground",
                              )}
                            >
                              {s.type === "end" ? "-" : s.actual.toFixed(2)}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              / {s.type === "end" ? "-" : s.target} {s.unit}
                            </span>
                          </span>
                          <StepState status={s.status} />
                        </div>
                        {s.type !== "end" && (
                          <div className="mt-2">
                            <Bar
                              value={s.progress}
                              tone={
                                s.status === "deviated"
                                  ? "danger"
                                  : s.status === "done"
                                    ? "success"
                                    : "info"
                              }
                            />
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      disabled={
                        emergency ||
                        target.status === "running" ||
                        target.status === "completed" ||
                        target.status === "aborted"
                      }
                      onClick={() => actions.start(target.id)}
                      className="flex items-center gap-2 rounded-md bg-success px-4 py-2 text-sm font-semibold text-success-foreground disabled:opacity-40"
                    >
                      <Play className="size-4" />{" "}
                      {target.status === "paused" ? "ทำงานต่อ" : "เริ่ม Batch"}
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
                      <p className="mb-2 text-sm font-medium">
                        ระบุเหตุผลการยกเลิก (บันทึกลง Audit Trail)
                      </p>
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
                        <button
                          onClick={() => setAbortOpen(false)}
                          className="rounded-md border border-border px-3 py-1.5 text-sm"
                        >
                          ปิด
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="สร้าง Batch ใหม่" className="holo-surface">
              <label className="label-caps mb-1 block">เลือกสูตรที่อนุมัติแล้ว</label>
              <select
                value={recipeId}
                onChange={(e) => setRecipeId(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/70 px-3 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {approved.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} {r.version} — {r.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => actions.createBatch(recipeId, "สมชาย ผลิตดี")}
                className="glow-button mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"
              >
                <Plus className="size-4" /> สร้าง Batch
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                ระบบจะออก Batch ID และ Lot No. อัตโนมัติ พร้อมตรวจความพร้อมของอุปกรณ์ก่อนเริ่มผลิต
              </p>
            </Panel>

            <Panel title="สถานะอุปกรณ์" className="holo-surface">
              <ul className="space-y-2">
                {equipment.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/60 px-3 py-2.5 text-sm shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)]"
                  >
                    <span
                      className={cn(
                        "size-2 rounded-full",
                        e.status === "ok"
                          ? "bg-success"
                          : e.status === "warn"
                            ? "bg-warning"
                            : "bg-destructive",
                      )}
                    />
                    <span className="min-w-0 flex-1 truncate">{e.name}</span>
                    <span className="hud-value text-muted-foreground">{e.id}</span>
                    <span className="hud-value w-20 text-right text-primary">
                      {e.value} {e.unit}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="การแจ้งเตือนล่าสุด"
              className="holo-surface"
              right={
                <Link to="/alarms" className="text-xs text-info hover:underline">
                  ดูทั้งหมด
                </Link>
              }
            >
              <ul className="space-y-2">
                {recentAlarms.map((a) => (
                  <li
                    key={a.id}
                    className="rounded-xl border border-border/70 bg-card/60 p-3 text-sm"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <AlarmBadge level={a.level} />
                      <span className="hud-value text-xs text-muted-foreground">
                        {fmtShort(a.at)}
                      </span>
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
    <div className="rounded-xl border border-border/70 bg-card/60 px-3 py-2 shadow-[inset_0_1px_0_oklch(1_0_0_/_0.04)]">
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
