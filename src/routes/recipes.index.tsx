import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/mixing/AppShell";
import { Panel, RecipeBadge, fmtTime } from "@/components/mixing/bits";
import { actions, useSimState } from "@/lib/mixing/store";

export const Route = createFileRoute("/recipes/")({
  head: () => ({
    meta: [
      { title: "สูตรการผสม — Smart Mixing Control" },
      { name: "description", content: "จัดการสูตรการผสม ควบคุมเวอร์ชัน ลำดับการเติมวัตถุดิบ Tolerance และการอนุมัติสูตรก่อนใช้ผลิตจริง" },
      { property: "og:title", content: "สูตรการผสม — Smart Mixing Control" },
      { property: "og:description", content: "Recipe Management พร้อม Version Control และ Workflow การอนุมัติ" },
    ],
  }),
  component: RecipesPage,
});

function RecipesPage() {
  const { recipes } = useSimState();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const rows = recipes.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (r.code + r.name + r.product).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <AppShell title="สูตรการผสม (Recipe Management)" subtitle="สร้าง แก้ไข ควบคุมเวอร์ชัน และอนุมัติสูตรก่อนนำไปผลิต">
      <Panel>
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ค้นหารหัสสูตร ชื่อสูตร หรือรหัสสินค้า"
            className="min-w-56 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">ทุกสถานะ</option>
            <option value="approved">อนุมัติแล้ว</option>
            <option value="pending">รออนุมัติ</option>
            <option value="draft">ร่าง</option>
            <option value="archived">เลิกใช้งาน</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-3xl text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["รหัสสูตร", "ชื่อสูตร", "สินค้า", "เวอร์ชัน", "ขนาด Batch", "ขั้นตอน", "สถานะ", "แก้ไขล่าสุด", ""].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/60 last:border-0">
                  <td className="hud-value py-3 pr-4">{r.code}</td>
                  <td className="py-3 pr-4">{r.name}</td>
                  <td className="hud-value py-3 pr-4 text-muted-foreground">{r.product}</td>
                  <td className="hud-value py-3 pr-4">{r.version}</td>
                  <td className="hud-value py-3 pr-4">{r.batchSizeKg} kg</td>
                  <td className="hud-value py-3 pr-4">{r.steps.length}</td>
                  <td className="py-3 pr-4"><RecipeBadge status={r.status} /></td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{fmtTime(r.updatedAt)}</td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {r.status === "pending" && (
                        <button onClick={() => actions.approveRecipe(r.id)} className="text-xs font-medium text-success hover:underline">
                          อนุมัติ
                        </button>
                      )}
                      <Link to="/recipes/$recipeId" params={{ recipeId: r.id }} className="text-xs text-info hover:underline">
                        รายละเอียด
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={9} className="py-10 text-center text-muted-foreground">ไม่พบสูตรที่ตรงกับเงื่อนไข</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}
