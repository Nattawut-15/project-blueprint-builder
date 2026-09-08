import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppShell } from "@/components/mixing/AppShell";
import { Metric, Panel, fmtTime } from "@/components/mixing/bits";
import { useSimState } from "@/lib/mixing/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "รายงานการผลิต — Smart Mixing Control" },
      { name: "description", content: "สรุปผลการผลิต อัตราความสำเร็จของ Batch การเบี่ยงเบนจากสูตร และส่งออกรายงานเพื่อการตรวจสอบย้อนหลัง" },
      { property: "og:title", content: "รายงานการผลิต — Smart Mixing Control" },
      { property: "og:description", content: "รายงานสรุปการผลิตและการเบี่ยงเบน พร้อมส่งออกไฟล์" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { batches, alarms } = useSimState();
  const done = batches.filter((b) => b.status === "completed");
  const aborted = batches.filter((b) => b.status === "aborted" || b.status === "failed");
  const deviations = batches.flatMap((b) => b.steps.filter((s) => s.status === "deviated").map((s) => ({ b, s })));
  const rate = batches.length ? Math.round((done.length / batches.length) * 100) : 0;

  const chart = batches
    .slice(0, 8)
    .reverse()
    .map((b) => ({
      name: b.batchNo.slice(-5),
      dev: b.steps.filter((s) => s.status === "deviated").length,
      steps: b.steps.length,
      status: b.status,
    }));

  const exportAll = () => {
    const head = "Batch,Lot,สินค้า,สูตร,เวอร์ชัน,Operator,สถานะ,เริ่ม,สิ้นสุด,รายการเบี่ยงเบน";
    const body = batches
      .map((b) => [b.batchNo, b.lot, b.product, b.recipeCode, b.recipeVersion, b.operator, b.status, b.startedAt ?? "-", b.endedAt ?? "-", b.steps.filter((s) => s.status === "deviated").length].join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + head + "\n" + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "production-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell
      title="รายงานการผลิต"
      subtitle="สรุปผลการผลิต การเบี่ยงเบน และข้อมูลสำหรับการตรวจสอบย้อนหลัง"
      actions={
        <div className="flex gap-2">
          <button onClick={exportAll} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">ส่งออก CSV</button>
          <button onClick={() => window.print()} className="rounded-md border border-border px-3 py-2 text-sm">พิมพ์ / PDF</button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Batch ทั้งหมด" value={batches.length} />
          <Metric label="ผลิตสำเร็จ" value={done.length} tone="success" hint={`อัตราสำเร็จ ${rate}%`} />
          <Metric label="ยกเลิก / ล้มเหลว" value={aborted.length} tone="danger" />
          <Metric label="Alarm สะสม" value={alarms.length} tone="warning" />
        </div>

        <Panel title="จำนวนรายการเบี่ยงเบนต่อ Batch">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--popover-foreground)" }}
                  labelStyle={{ color: "var(--muted-foreground)" }}
                />
                <Bar dataKey="dev" radius={[4, 4, 0, 0]}>
                  {chart.map((c, i) => (
                    <Cell key={i} fill={c.dev > 0 ? "var(--destructive)" : "var(--success)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="รายการเบี่ยงเบนจากสูตร (สำหรับ QA/QC)">
          {deviations.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">ไม่พบการเบี่ยงเบนในช่วงข้อมูลนี้</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-3xl text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    {["Batch", "สูตร", "ขั้นตอน", "เป้าหมาย", "ค่าจริง", "ส่วนต่าง", "เวลา"].map((h) => (
                      <th key={h} className="label-caps py-2 pr-4 font-normal">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deviations.map(({ b, s }, i) => (
                    <tr key={`${b.id}-${s.no}-${i}`} className="border-b border-border/60 last:border-0">
                      <td className="hud-value py-3 pr-4">{b.batchNo}</td>
                      <td className="py-3 pr-4">{b.recipeCode} {b.recipeVersion}</td>
                      <td className="py-3 pr-4">{s.no}. {s.action}</td>
                      <td className="hud-value py-3 pr-4">{s.target} {s.unit}</td>
                      <td className="hud-value py-3 pr-4">{s.actual.toFixed(2)}</td>
                      <td className="hud-value py-3 pr-4 text-destructive">{(s.actual - s.target >= 0 ? "+" : "") + (s.actual - s.target).toFixed(2)}</td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">{fmtTime(s.endedAt ?? s.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </AppShell>
  );
}
