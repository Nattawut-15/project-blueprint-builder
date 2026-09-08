import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mixing/AppShell";
import { Panel } from "@/components/mixing/bits";
import { users } from "@/lib/mixing/seed";
import { ROLE_LABEL, type Role } from "@/lib/mixing/types";

export const Route = createFileRoute("/users")({
  head: () => ({
    meta: [
      { title: "ผู้ใช้และสิทธิ์ — Smart Mixing Control" },
      { name: "description", content: "จัดการผู้ใช้งานและสิทธิ์ตามบทบาท Operator, Supervisor, Engineer, QA และ Admin" },
      { property: "og:title", content: "ผู้ใช้และสิทธิ์ — Smart Mixing Control" },
      { property: "og:description", content: "Role-based Access Control สำหรับระบบควบคุมการผสม" },
    ],
  }),
  component: UsersPage,
});

const PERMISSIONS: { name: string; roles: Role[] }[] = [
  { name: "เริ่ม / พัก Batch", roles: ["operator", "supervisor", "admin"] },
  { name: "ยกเลิก Batch", roles: ["supervisor", "admin"] },
  { name: "สร้าง / แก้ไขสูตร", roles: ["supervisor", "engineer", "admin"] },
  { name: "อนุมัติสูตร", roles: ["supervisor", "qa"] },
  { name: "ตั้งค่าอุปกรณ์ / Calibration", roles: ["engineer", "admin"] },
  { name: "ดูรายงานและ Batch Record", roles: ["operator", "supervisor", "engineer", "qa", "admin"] },
  { name: "จัดการผู้ใช้และ Master Data", roles: ["admin"] },
];

const ALL: Role[] = ["operator", "supervisor", "engineer", "qa", "admin"];

function UsersPage() {
  return (
    <AppShell title="ผู้ใช้และสิทธิ์การใช้งาน" subtitle="กำหนดบทบาทและสิทธิ์ตามหลัก Role-based Access Control">
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="ผู้ใช้งานในระบบ">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                {["รหัส", "ชื่อ", "บทบาท", "กะ", "สถานะ"].map((h) => (
                  <th key={h} className="label-caps py-2 pr-4 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border/60 last:border-0">
                  <td className="hud-value py-3 pr-4 text-muted-foreground">{u.id}</td>
                  <td className="py-3 pr-4">{u.name}</td>
                  <td className="py-3 pr-4">{ROLE_LABEL[u.role]}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{u.shift}</td>
                  <td className="py-3 pr-4">
                    <span className={u.active ? "text-success" : "text-muted-foreground"}>{u.active ? "ใช้งานอยู่" : "ปิดใช้งาน"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="ตารางสิทธิ์ตามบทบาท">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="label-caps py-2 pr-4 font-normal">ฟังก์ชัน</th>
                  {ALL.map((r) => (
                    <th key={r} className="label-caps py-2 pr-3 text-center font-normal">{ROLE_LABEL[r]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.name} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-4">{p.name}</td>
                    {ALL.map((r) => (
                      <td key={r} className="py-3 pr-3 text-center">
                        {p.roles.includes(r) ? <span className="text-success">✓</span> : <span className="text-muted-foreground/40">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}
