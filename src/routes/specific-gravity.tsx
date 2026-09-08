import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mixing/AppShell";
import { Metric, Panel, RecipeBadge } from "@/components/mixing/bits";
import { SPECIFIC_GRAVITY_BY_RECIPE } from "@/lib/mixing/specific-gravity";
import { useSimState } from "@/lib/mixing/store";

export const Route = createFileRoute("/specific-gravity")({
  head: () => ({
    meta: [
      { title: "ค่า ถ.พ — Smart Mixing Control" },
      {
        name: "description",
        content: "ค่า ถ.พ หรือความถ่วงจำเพาะของยาแต่ละประเภท สำหรับตรวจรับและคำนวณปริมาตร",
      },
    ],
  }),
  component: SpecificGravityPage,
});

function SpecificGravityPage() {
  const { recipes } = useSimState();
  const rows = recipes.map((recipe) => ({
    recipe,
    specificGravity: SPECIFIC_GRAVITY_BY_RECIPE[recipe.id] ?? {
      type: "ยังไม่ระบุประเภท",
      value: 1,
    },
  }));
  const average = rows.reduce((sum, row) => sum + row.specificGravity.value, 0) / rows.length;
  const highest = rows.reduce((max, row) =>
    row.specificGravity.value > max.specificGravity.value ? row : max,
  );

  return (
    <AppShell
      title="ค่า ถ.พ ของยาแต่ละประเภท"
      subtitle="ความถ่วงจำเพาะสำหรับตรวจรับวัตถุดิบ ควบคุมสูตร และคำนวณปริมาตร"
    >
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="จำนวนประเภท" value={rows.length} unit="รายการ" tone="info" />
          <Metric label="ค่าเฉลี่ย ถ.พ" value={average.toFixed(2)} tone="success" />
          <Metric
            label="ค่าสูงสุด"
            value={highest.specificGravity.value.toFixed(2)}
            hint={highest.specificGravity.type}
            tone="warning"
          />
        </div>

        <Panel title="รายการค่า ถ.พ">
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map(({ recipe, specificGravity }) => (
              <article key={recipe.id} className="rounded-xl border border-border bg-card/70 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      {specificGravity.type}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{recipe.name}</p>
                  </div>
                  <div className="hud-value rounded-lg bg-secondary px-3 py-2 text-lg font-semibold text-info">
                    {specificGravity.value.toFixed(2)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="hud-value rounded-sm bg-muted px-2 py-1">{recipe.product}</span>
                  <span className="hud-value rounded-sm bg-muted px-2 py-1">{recipe.code}</span>
                  <RecipeBadge status={recipe.status} />
                </div>
              </article>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            ถ.พ = ความถ่วงจำเพาะ ใช้อ้างอิงตอนตรวจรับ คำนวณปริมาตร และตรวจความสม่ำเสมอของผลิตภัณฑ์
          </p>
        </Panel>
      </div>
    </AppShell>
  );
}
