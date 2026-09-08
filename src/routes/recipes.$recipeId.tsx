import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/mixing/AppShell";
import { Panel, RecipeBadge, fmtTime } from "@/components/mixing/bits";
import { actions, useSimState } from "@/lib/mixing/store";

export const Route = createFileRoute("/recipes/$recipeId")({
  head: () => ({
    meta: [
      { title: "รายละเอียดสูตร — Smart Mixing Control" },
      { name: "description", content: "ดูลำดับขั้นตอนการผสม ค่าเป้าหมาย Tolerance ความเร็วรอบ และเงื่อนไขควบคุมของแต่ละสูตร" },
      { property: "og:title", content: "รายละเอียดสูตร — Smart Mixing Control" },
      { property: "og:description", content: "Step-based Recipe พร้อมค่าควบคุมและเงื่อนไขอุปกรณ์" },
    ],
  }),
  component: RecipeDetail,
  errorComponent: ({ error }) => <div role="alert" className="p-8 text-sm text-destructive">{error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">ไม่พบสูตรนี้ในระบบ</div>,
});

const TYPE_LABEL: Record<string, string> = {
  dose: "เติมวัตถุดิบ",
  mix: "ผสม",
  temp: "ควบคุมอุณหภูมิ",
  end: "จบ Batch",
};

function RecipeDetail() {
  const { recipeId } = Route.useParams();
  const { recipes } = useSimState();
  const recipe = recipes.find((r) => r.id === recipeId);
  if (!recipe) throw notFound();

  return (
    <AppShell
      title={`${recipe.code} — ${recipe.name}`}
      subtitle={`เวอร์ชัน ${recipe.version} · สินค้า ${recipe.product} · ขนาด Batch ${recipe.batchSizeKg} kg`}
      actions={
        <div className="flex items-center gap-3">
          <RecipeBadge status={recipe.status} />
          {recipe.status === "pending" && (
            <button onClick={() => actions.approveRecipe(recipe.id)} className="rounded-md bg-success px-3 py-2 text-sm font-semibold text-success-foreground">
              อนุมัติสูตร
            </button>
          )}
          <Link to="/recipes" className="text-sm text-info hover:underline">กลับ</Link>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.7fr_1fr]">
        <Panel title="ลำดับขั้นตอนการผสม">
          <div className="overflow-x-auto">
            <table className="w-full min-w-3xl text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  {["ขั้น", "ประเภท", "รายละเอียด", "วัตถุดิบ", "ค่าเป้าหมาย", "Tolerance", "เงื่อนไขควบคุม"].map((h) => (
                    <th key={h} className="label-caps py-2 pr-4 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recipe.steps.map((s) => (
                  <tr key={s.no} className="border-b border-border/60 last:border-0">
                    <td className="hud-value py-3 pr-4">{s.no}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{TYPE_LABEL[s.type]}</td>
                    <td className="py-3 pr-4">{s.action}</td>
                    <td className="hud-value py-3 pr-4 text-muted-foreground">{s.material ?? "-"}</td>
                    <td className="hud-value py-3 pr-4">{s.type === "end" ? "-" : `${s.target} ${s.unit}`}</td>
                    <td className="hud-value py-3 pr-4">{s.tolerance ? `±${s.tolerance} ${s.unit}` : "-"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{s.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel title="ข้อมูลสูตร">
            <dl className="space-y-3 text-sm">
              <Row k="ผู้ดูแลสูตร" v={recipe.owner} />
              <Row k="ผู้อนุมัติ" v={recipe.approvedBy ?? "ยังไม่ได้อนุมัติ"} />
              <Row k="แก้ไขล่าสุด" v={fmtTime(recipe.updatedAt)} />
              <Row k="จำนวนขั้นตอน" v={`${recipe.steps.length} ขั้นตอน`} />
              <Row k="ความเร็วรอบสูงสุด" v={`${Math.max(...recipe.steps.map((s) => s.speedRpm ?? 0))} RPM`} />
            </dl>
          </Panel>
          <Panel title="สรุปวัตถุดิบ">
            <ul className="space-y-2 text-sm">
              {recipe.steps.filter((s) => s.type === "dose").map((s) => (
                <li key={s.no} className="flex items-center gap-3 rounded-md bg-card/60 px-3 py-2">
                  <span className="hud-value text-muted-foreground">{s.material}</span>
                  <span className="hud-value ml-auto">{s.target} {s.unit}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
