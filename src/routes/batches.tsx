import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/mixing/AppShell";
import { BatchBadge, Panel, fmtTime } from "@/components/mixing/bits";
import { useSimState } from "@/lib/mixing/store";

export const Route = createFileRoute("/batches")({
  head: () => ({
    meta: [
      { title: "Batch การผลิต — Smart Mixing Control" },
      { name: "description", content: "ติดตามสถานะ Batch ทั้งหมด ค้นหาย้อนหลังตาม Batch ID, Lot, สินค้า และช่วงสถานะการผลิต" },
      { property: "og:title", content: "Batch การผลิต — Smart Mixing Control" },
      { property: "og:description", content: "ประวัติและสถานะ Batch ทั้งหมดในสายการผลิต" },
    ],
  }),
  component: BatchesPage,
});

function BatchesPage() {
  const { batches } = useSimState();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const rows = batches.filter(
    (b) =>
      (status === "all" || b.status === status) &&
      (b.batchNo + b.lot + b.product + b.recipeCode).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="Batch การผลิต" subtitle="ค้นหาและติดตาม Batch ทั้งหมด พร้อมเข้าถึง Batch Record ย้อนหลัง">
      <Panel>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหา Batch No., Lot, สินค้า หรือรหัสสูตร"
            className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="pending">รอเริ่ม</option>
            <option value="running">กำลังผลิต</option>
            <option value="paused">พักชั่วคราว</option>
            <option value="completed">เสร็จสมบูรณ์</option>
            <option value="aborted">ยกเลิก</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["Batch No.", "Lot", "สินค้า", "สูตร", "Operator", "เริ่ม", "สิ้นสุด", "สถานะ", ""].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className="border-b border-border/60 last:border-0">
                  <td className="hud-value py-3 pr-4">{b.batchNo}</td>
                  <td className="hud-value py-3 pr-4 text-muted-foreground">{b.lot}</td>
                  <td className="hud-value py-3 pr-4">{b.product}</td>
                  <td className="py-3 pr-4">{b.recipeCode} <span className="text-muted-foreground">{b.recipeVersion}</span></td>
                  <td className="py-3 pr-4">{b.operator}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{fmtTime(b.startedAt)}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{fmtTime(b.endedAt)}</td>
                  <td className="py-3 pr-4"><BatchBadge status={b.status} /></td>
                  <td className="py-3 text-right">
                    <Link to="/batches/$batchId" params={{ batchId: b.id }} className="text-xs text-info hover:underline">
                      Batch Record
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">ไม่พบ Batch ที่ตรงกับเงื่อนไข</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
