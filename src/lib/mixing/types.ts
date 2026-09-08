export type Role = "operator" | "supervisor" | "engineer" | "qa" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  operator: "Operator",
  supervisor: "Supervisor",
  engineer: "Engineer",
  qa: "QA/QC",
  admin: "Admin",
};

export type StepType = "dose" | "mix" | "temp" | "end";

export type RecipeStep = {
  no: number;
  type: StepType;
  action: string;
  material?: string;
  target: number;
  unit: string;
  tolerance?: number;
  speedRpm?: number;
  tempC?: number;
  condition: string;
};

export type RecipeStatus = "draft" | "pending" | "approved" | "archived";

export type Recipe = {
  id: string;
  code: string;
  name: string;
  product: string;
  version: string;
  status: RecipeStatus;
  owner: string;
  approvedBy?: string;
  updatedAt: string;
  batchSizeKg: number;
  steps: RecipeStep[];
};

export type BatchStatus =
  | "pending"
  | "running"
  | "paused"
  | "completed"
  | "aborted"
  | "failed";

export type StepLog = {
  no: number;
  action: string;
  type: StepType;
  target: number;
  unit: string;
  tolerance?: number;
  actual: number;
  progress: number;
  status: "waiting" | "running" | "done" | "deviated";
  startedAt?: string;
  endedAt?: string;
};

export type Batch = {
  id: string;
  batchNo: string;
  lot: string;
  recipeId: string;
  recipeCode: string;
  recipeVersion: string;
  product: string;
  operator: string;
  status: BatchStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
  currentStep: number;
  abortReason?: string;
  steps: StepLog[];
};

export type AlarmLevel = "info" | "warning" | "critical";

export type Alarm = {
  id: string;
  at: string;
  level: AlarmLevel;
  source: string;
  message: string;
  batchNo?: string;
  ackBy?: string;
  ackAt?: string;
};

export type AuditEntry = {
  id: string;
  at: string;
  user: string;
  role: Role;
  action: string;
  detail: string;
};

export type Equipment = {
  id: string;
  name: string;
  kind: string;
  status: "ok" | "warn" | "fault";
  value: number;
  unit: string;
};
