import { useSyncExternalStore } from "react";
import { equipmentSeed, historyBatches, recipes as recipeSeed, seedAlarms, seedAudit, users } from "./seed";
import type { Alarm, AuditEntry, Batch, Equipment, Recipe, StepLog } from "./types";

export type SimState = {
  recipes: Recipe[];
  batches: Batch[];
  alarms: Alarm[];
  audit: AuditEntry[];
  equipment: Equipment[];
  activeBatchId: string | null;
  clock: number;
  emergency: boolean;
};

const TICK_MS = 500;

function nowIso() {
  return new Date().toISOString();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function makeSteps(recipe: Recipe): StepLog[] {
  return recipe.steps.map((s) => ({
    no: s.no,
    action: s.action,
    type: s.type,
    target: s.target,
    unit: s.unit,
    tolerance: s.tolerance,
    actual: s.type === "temp" ? 31.5 : 0,
    progress: 0,
    status: "waiting" as const,
  }));
}

let seq = 4;

function createBatch(recipe: Recipe, operator: string): Batch {
  seq += 1;
  const d = new Date();
  const stamp = `${String(d.getFullYear() + 543).slice(-2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
  return {
    id: `B-24${seq}`,
    batchNo: `BX-${stamp}-${pad(seq)}`,
    lot: `LOT-${stamp}-${String.fromCharCode(64 + seq)}`,
    recipeId: recipe.id,
    recipeCode: recipe.code,
    recipeVersion: recipe.version,
    product: recipe.product,
    operator,
    status: "pending",
    createdAt: nowIso(),
    currentStep: 1,
    steps: makeSteps(recipe),
  };
}

let alarmSeq = 9100;
function alarm(level: Alarm["level"], source: string, message: string, batchNo?: string): Alarm {
  alarmSeq += 1;
  return { id: `A-${alarmSeq}`, at: nowIso(), level, source, message, batchNo };
}

let auditSeq = 100;
function audit(user: string, role: AuditEntry["role"], action: string, detail: string): AuditEntry {
  auditSeq += 1;
  return { id: `T-${auditSeq}`, at: nowIso(), user, role, action, detail };
}

let state: SimState = {
  recipes: recipeSeed,
  batches: historyBatches,
  alarms: seedAlarms,
  audit: seedAudit,
  equipment: equipmentSeed,
  activeBatchId: null,
  clock: 0,
  emergency: false,
};

const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function set(patch: Partial<SimState>) {
  state = { ...state, ...patch };
  emit();
}

// --- simulation engine -------------------------------------------------

function tick() {
  const batch = state.batches.find((b) => b.id === state.activeBatchId);
  const clock = state.clock + 1;
  if (!batch || batch.status !== "running") {
    // idle equipment drift
    set({ clock, equipment: driftEquipment(false, 0, 0) });
    return;
  }

  const steps = batch.steps.map((s) => ({ ...s }));
  const idx = steps.findIndex((s) => s.no === batch.currentStep);
  const step = steps[idx];
  const newAlarms: Alarm[] = [];
  let status = batch.status;
  let endedAt = batch.endedAt;
  let currentStep = batch.currentStep;

  if (step) {
    if (step.status === "waiting") {
      step.status = "running";
      step.startedAt = nowIso();
    }

    if (step.type === "dose") {
      const rate = Math.max(step.target / 24, 0.4);
      const noise = (Math.random() - 0.45) * rate * 0.15;
      step.actual = Math.min(step.target + (step.tolerance ?? 0) * 1.4, step.actual + rate + noise);
      step.progress = Math.min(1, step.actual / step.target);
      if (step.actual >= step.target - (step.tolerance ?? 0) * 0.3) {
        const dev = step.actual - step.target;
        const tol = step.tolerance ?? 0;
        if (Math.abs(dev) > tol) {
          step.status = "deviated";
          newAlarms.push(
            alarm(
              "warning",
              "Load Cell LC-01",
              `น้ำหนัก ${step.action} เบี่ยงเบน ${dev > 0 ? "+" : ""}${dev.toFixed(2)} ${step.unit} เกิน Tolerance ±${tol} ${step.unit}`,
              batch.batchNo,
            ),
          );
        } else {
          step.status = "done";
        }
        step.progress = 1;
        step.endedAt = nowIso();
        currentStep = step.no + 1;
      }
    } else if (step.type === "mix") {
      const totalTicks = Math.max(6, step.target * 4); // เร่งเวลาให้ดูผลได้เร็ว
      step.actual = Math.min(step.target, step.actual + step.target / totalTicks);
      step.progress = Math.min(1, step.actual / step.target);
      if (step.progress >= 1) {
        step.status = "done";
        step.endedAt = nowIso();
        currentStep = step.no + 1;
      }
    } else if (step.type === "temp") {
      const goingUp = step.target > 45;
      const drift = goingUp ? 1.6 : -0.9;
      step.actual = step.actual + drift + (Math.random() - 0.5) * 0.3;
      step.progress = goingUp
        ? Math.min(1, step.actual / step.target)
        : Math.min(1, step.actual <= step.target ? 1 : step.target / step.actual);
      if ((goingUp && step.actual >= step.target) || (!goingUp && step.actual <= step.target)) {
        step.status = "done";
        step.progress = 1;
        step.endedAt = nowIso();
        currentStep = step.no + 1;
      }
    } else {
      step.status = "done";
      step.progress = 1;
      step.endedAt = nowIso();
      status = "completed";
      endedAt = nowIso();
      currentStep = step.no;
      newAlarms.push(alarm("info", "ระบบ", `Batch ${batch.batchNo} ผลิตเสร็จสมบูรณ์ และบันทึก Batch Record แล้ว`, batch.batchNo));
    }
  }

  const running = status === "running";
  const speed = running && step?.type === "mix" ? recipeSpeed(batch, step.no) : running ? 120 : 0;
  const weight = steps.filter((s) => s.type === "dose").reduce((a, s) => a + s.actual, 0);
  const temp = steps.find((s) => s.type === "temp")?.actual ?? 31.5 + (running ? 4 : 0);

  const updated: Batch = { ...batch, steps, currentStep, status, endedAt };
  set({
    clock,
    batches: state.batches.map((b) => (b.id === batch.id ? updated : b)),
    alarms: newAlarms.length ? [...newAlarms, ...state.alarms] : state.alarms,
    equipment: driftEquipment(running, speed, weight, temp),
    activeBatchId: status === "completed" ? null : state.activeBatchId,
  });
}

function recipeSpeed(batch: Batch, stepNo: number) {
  const recipe = state.recipes.find((r) => r.id === batch.recipeId);
  return recipe?.steps.find((s) => s.no === stepNo)?.speedRpm ?? 300;
}

function driftEquipment(running: boolean, speed: number, weight: number, temp?: number): Equipment[] {
  return state.equipment.map((e) => {
    const jitter = () => (Math.random() - 0.5) * 0.6;
    switch (e.id) {
      case "M-01":
        return { ...e, value: running ? Math.round(speed + jitter() * 8) : 0 };
      case "LC-01":
        return { ...e, value: Number((weight + jitter() * 0.05).toFixed(2)) };
      case "TT-01":
        return { ...e, value: Number(((temp ?? 31.5) + jitter() * 0.2).toFixed(1)) };
      case "FT-01":
        return { ...e, value: running ? Number((42 + jitter() * 4).toFixed(1)) : 0 };
      case "LV-01":
        return { ...e, value: running ? 100 : 0 };
      case "PP-02":
        return { ...e, value: running ? 65 : 0 };
      default:
        return e;
    }
  });
}

function ensureTimer() {
  if (typeof window === "undefined" || timer) return;
  timer = setInterval(tick, TICK_MS);
}

// --- actions -----------------------------------------------------------

export const actions = {
  createBatch(recipeId: string, operator: string) {
    const recipe = state.recipes.find((r) => r.id === recipeId);
    if (!recipe || recipe.status !== "approved") return null;
    const batch = createBatch(recipe, operator);
    set({
      batches: [batch, ...state.batches],
      audit: [audit(operator, "operator", "สร้าง Batch", `${batch.batchNo} จากสูตร ${recipe.code} ${recipe.version}`), ...state.audit],
    });
    return batch;
  },
  start(batchId: string) {
    if (state.emergency) return;
    const b = state.batches.find((x) => x.id === batchId);
    if (!b || (b.status !== "pending" && b.status !== "paused")) return;
    set({
      activeBatchId: batchId,
      batches: state.batches.map((x) =>
        x.id === batchId ? { ...x, status: "running", startedAt: x.startedAt ?? nowIso() } : x,
      ),
      alarms: [alarm("info", "ระบบ", `เริ่มเดินเครื่อง Batch ${b.batchNo}`, b.batchNo), ...state.alarms],
    });
  },
  pause(batchId: string) {
    const b = state.batches.find((x) => x.id === batchId);
    if (!b) return;
    set({
      batches: state.batches.map((x) => (x.id === batchId ? { ...x, status: "paused" } : x)),
      alarms: [alarm("warning", "ระบบ", `พักการทำงาน Batch ${b.batchNo} โดยผู้ใช้งาน`, b.batchNo), ...state.alarms],
    });
  },
  abort(batchId: string, reason: string, user = "สมชาย ผลิตดี") {
    const b = state.batches.find((x) => x.id === batchId);
    if (!b) return;
    set({
      activeBatchId: state.activeBatchId === batchId ? null : state.activeBatchId,
      batches: state.batches.map((x) =>
        x.id === batchId ? { ...x, status: "aborted", endedAt: nowIso(), abortReason: reason } : x,
      ),
      alarms: [alarm("critical", "ระบบ", `ยกเลิก Batch ${b.batchNo}: ${reason}`, b.batchNo), ...state.alarms],
      audit: [audit(user, "operator", "ยกเลิก Batch", `${b.batchNo} เหตุผล: ${reason}`), ...state.audit],
    });
  },
  ackAlarm(id: string, user = "สมชาย ผลิตดี") {
    set({
      alarms: state.alarms.map((a) => (a.id === id ? { ...a, ackBy: user, ackAt: nowIso() } : a)),
    });
  },
  ackAll(user = "สมชาย ผลิตดี") {
    set({ alarms: state.alarms.map((a) => (a.ackBy ? a : { ...a, ackBy: user, ackAt: nowIso() })) });
  },
  emergencyStop() {
    const active = state.batches.find((b) => b.id === state.activeBatchId);
    set({
      emergency: true,
      activeBatchId: null,
      batches: active
        ? state.batches.map((x) => (x.id === active.id ? { ...x, status: "paused" } : x))
        : state.batches,
      alarms: [alarm("critical", "Emergency Stop", "กด Emergency Stop — ระบบหยุดการจ่ายวัตถุดิบและ Mixer ทั้งหมด", active?.batchNo), ...state.alarms],
      audit: [audit("สมชาย ผลิตดี", "operator", "Emergency Stop", "หยุดฉุกเฉินจากหน้าจอ Operator"), ...state.audit],
    });
  },
  resetEmergency() {
    set({
      emergency: false,
      alarms: [alarm("info", "Emergency Stop", "รีเซ็ตสถานะหยุดฉุกเฉิน ระบบพร้อมทำงาน"), ...state.alarms],
    });
  },
  approveRecipe(recipeId: string, by = "พิมพ์ใจ คุณภาพ") {
    const r = state.recipes.find((x) => x.id === recipeId);
    if (!r) return;
    set({
      recipes: state.recipes.map((x) =>
        x.id === recipeId ? { ...x, status: "approved", approvedBy: by, updatedAt: nowIso() } : x,
      ),
      audit: [audit(by, "qa", "อนุมัติสูตร", `${r.code} ${r.version} ผ่านการอนุมัติ`), ...state.audit],
    });
  },
};

// --- hooks -------------------------------------------------------------

function subscribe(cb: () => void) {
  ensureTimer();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function useSim<T>(selector: (s: SimState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  );
}

export function useSimState(): SimState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
}
