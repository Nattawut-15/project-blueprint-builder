import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlarmBadge, Bar, BatchBadge, Panel, fmtTime } from "@/components/mixing/bits";
import { AppShell } from "@/components/mixing/AppShell";
import { useSimState } from "@/lib/mixing/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/batches/$batchId")({
  head: () => ({
    meta: [
      { title: "Batch Record — Smart Mixing Control" },
      { name: "description", content: "บันทึกการผลิตรายล็อต: ค่าที่ตั้ง ค่าจริง การเบี่ยงเบน การแจ้งเตือน และผู้ปฏิบัติงาน พร้อมส่งออกรายงาน" },
      { property: "og:title", content: "Batch Record — Smart Mixing Control" },
      { property: "og:description", content: "รายละเอียดการผลิตย้อนหลังพร้อมข้อมูลการตรวจสอบย้อนกลับ" },
    ],
  }),
  component: BatchRecord,
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">ไม่พบ Batch นี้ในระบบ</div>,
});

function BatchRecord() {
  const { batchId } = Route.useParams();
  const { batches, alarms } = useSimState();
  const batch = batches.find((b) => b.id === batchId);
  if (!batch) throw notFound();

  const batchAlarms = alarms.filter((a) => a.batchNo === batch.batchNo);
  const deviations = batch.steps.filter((s) => s.status === "deviated");

  const exportCsv = () => {
    const head = "ขั้นตอน,รายละเอียด,ค่าเป้าหมาย,หน่วย,Tolerance,ค่าจริง,สถานะ,เริ่ม,สิ้นสุด";
    const body = batch.steps
      .map((s) => [s.no, s.action, s.target, s.unit, s.tolerance ?? "-", s.actual.toFixed(2), s.status, s.startedAt ?? "-", s.endedAt ?? "-"].join(","))
      .join("\n");
    const meta = `Batch,${batch.batchNo}\nLot,${batch.lot}\nสูตร,${batch.recipeCode} ${batch.recipeVersion}\nOperator,${batch.operator}\n\n`;
    const blob = new Blob(["\uFEFF" + meta + head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${batch.batchNo}-record.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title={`Batch Record — ${batch.batchNo}`}
      subtitle={`Lot ${batch.lot} · สูตร ${batch.recipeCode} ${batch.recipeVersion} · Operator ${batch.operator}`}
      actions={
        <div className="flex items-center gap-3">
          <BatchBadge status={batch.status} />
          <button onClick={exportCsv} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
            ส่งออก CSV
          </button>
          <button onClick={() => window.print()} className="rounded-md border border-border px-3 py-2 text-sm">
            พิมพ์ / PDF
          </button>
          <Link to="/batches" className="text-sm text-info hover:underline">กลับ</Link>
        </div>
      }
    >
      <div className="space-y-5">
        {batch.abortReason && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            ยกเลิก Batch — เหตุผล: {batch.abortReason}
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Info k="เวลาเริ่ม" v={fmtTime(batch.startedAt)} />
          <Info k="เวลาสิ้นสุด" v={fmtTime(batch.endedAt)} />
          <Info k="ขั้นตอนที่ทำได้" v={`${batch.steps.filter((s) => s.status !== "waiting" && s.status !== "running").length}/${batch.steps.length}`} />
          <Info k="รายการเบี่ยงเบน" v={`${deviations.length} รายการ`} tone={deviations.length ? "danger" : "success"} />
        </div>

        <Panel title="บันทึกค่าตามขั้นตอน (ค่าที่ตั้ง vs ค่าจริง)">
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["ขั้น", "รายละเอียด", "เป้าหมาย", "Tolerance", "ค่าจริง", "ส่วนต่าง", "ความคืบหน้า", "เริ่ม", "สิ้นสุด", "สถานะ"].map((h) => (
                    <th key={h} className="label-caps py-2 pr-4 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {batch.steps.map((s) => {
                  const diff = s.type === "end" ? 0 : s.actual - s.target;
                  return (
                    <tr key={s.no} className="border-b border-border/60 last:border-0">
                      <td className="hud-value py-3 pr-4">{s.no}</td>
                      <td className="py-3 pr-4">{s.action}</td>
                      <td className="hud-value py-3 pr-4">{s.type === "end" ? "-" : `${s.target} ${s.unit}`}</td>
                      <td className="hud-value py-3 pr-4">{s.tolerance ? `±${s.tolerance}` : "-"}</td>
                      <td className="hud-value py-3 pr-4">{s.type === "end" ? "-" : s.actual.toFixed(2)}</td>
                      <td className={cn("hud-value py-3 pr-4", s.status === "deviated" ? "text-destructive" : "text-muted-foreground")}>
                        {s.type === "end" ? "-" : `${diff >= 0 ? "+" : ""}${diff.toFixed(2)}`}
                      </td>
                      <td className="w-32 py-3 pr-4"><Bar value={s.progress} tone={s.status === "deviated" ? "danger" : "success"} /></td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{fmtTime(s.startedAt)}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{fmtTime(s.endedAt)}</td>
                      <td className="py-3 pr-4 text-xs">{s.status === "deviated" ? <span className="text-destructive">เบี่ยงเบน</span> : s.status === "done" ? <span className="text-success">ผ่าน</span> : <span className="text-muted-foreground">-</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title="การแจ้งเตือนที่เกี่ยวข้องกับ Batch นี้">
          {batchAlarms.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีการแจ้งเตือนใน Batch นี้</p>
          ) : (
            <ul className="space-y-2">
              {batchAlarms.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-md bg-card/60 px-3 py-2 text-sm">
                  <AlarmBadge level={a.level} />
                  <span className="hud-value text-xs text-muted-foreground">{fmtTime(a.at)}</span>
                  <span className="min-w-0 flex-1">{a.message}</span>
                  <span className="text-xs text-muted-foreground">{a.ackBy ? `รับทราบโดย ${a.ackBy}` : "ยังไม่รับทราบ"}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}

function Info({ k, v, tone = "default" }: { k: string; v: string; tone?: "default" | "danger" | "success" }) {
  return (
    <div className="panel p-4">
      <p className="label-caps">{k}</p>
      <p className={cn("hud-value mt-1 text-sm", tone === "danger" && "text-destructive", tone === "success" && "text-success")}>{v}</p>
    </div>
  );
}
