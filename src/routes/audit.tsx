import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mixing/AppShell";
import { Panel, fmtTime } from "@/components/mixing/bits";
import { useSimState } from "@/lib/mixing/store";
import { ROLE_LABEL } from "@/lib/mixing/types";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — Smart Mixing Control" },
      { name: "description", content: "บันทึกกิจกรรมสำคัญ เช่น การแก้ไขสูตร การอนุมัติ การ Override และการยกเลิก Batch พร้อมผู้กระทำและเวลา" },
      { property: "og:title", content: "Audit Trail — Smart Mixing Control" },
      { property: "og:description", content: "ประวัติการกระทำสำคัญในระบบเพื่อการตรวจสอบย้อนหลัง" },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { audit } = useSimState();
  return (
    <AppShell title="Audit Trail" subtitle="บันทึกกิจกรรมสำคัญของผู้ใช้งานเพื่อการตรวจสอบย้อนหลัง">
      <Panel>
        <ol className="relative space-y-4 border-l border-border pl-5">
          {audit.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[27px] top-1.5 size-2.5 rounded-full bg-primary" />
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">{a.action}</span>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{ROLE_LABEL[a.role]}</span>
                <span className="hud-value text-xs text-muted-foreground">{fmtTime(a.at)}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{a.detail}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">โดย {a.user}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </AppShell>
  );
}
