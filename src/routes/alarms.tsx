import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/mixing/AppShell";
import { AlarmBadge, Metric, Panel, fmtTime } from "@/components/mixing/bits";
import { actions, useSimState } from "@/lib/mixing/store";

export const Route = createFileRoute("/alarms")({
  head: () => ({
    meta: [
      { title: "การแจ้งเตือน — Smart Mixing Control" },
      { name: "description", content: "ประวัติ Alarm ทั้งหมดพร้อมระดับความรุนแรง แหล่งที่มา เวลา ผู้รับทราบ และ Batch ที่เกี่ยวข้อง" },
      { property: "og:title", content: "การแจ้งเตือน — Smart Mixing Control" },
      { property: "og:description", content: "Alarm และ Interlock แบบเรียลไทม์ พร้อมบันทึกการรับทราบ" },
    ],
  }),
  component: AlarmsPage,
});

function AlarmsPage() {
  const { alarms } = useSimState();
  const [level, setLevel] = useState("all");
  const rows = alarms.filter((a) => level === "all" || a.level === level);
  const unack = alarms.filter((a) => !a.ackBy).length;

  return (
    <AppShell
      title="การแจ้งเตือนและ Interlock"
      subtitle="ติดตามความผิดปกติของกระบวนการและอุปกรณ์ พร้อมบันทึกการรับทราบ"
      actions={
        <button onClick={() => actions.ackAll()} disabled={!unack} className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-40">
          รับทราบทั้งหมด
        </button>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="ยังไม่รับทราบ" value={unack} tone={unack ? "danger" : "success"} />
          <Metric label="ระดับวิกฤต" value={alarms.filter((a) => a.level === "critical").length} tone="danger" />
          <Metric label="ระดับเตือน" value={alarms.filter((a) => a.level === "warning").length} tone="warning" />
          <Metric label="ทั้งหมด" value={alarms.length} />
        </div>

        <Panel
          title="ประวัติการแจ้งเตือน"
          right={
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
              <option value="all">ทุกระดับ</option>
              <option value="critical">วิกฤต</option>
              <option value="warning">เตือน</option>
              <option value="info">ข้อมูล</option>
            </select>
          }
        >
          <ul className="space-y-2">
            {rows.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-3 rounded-md bg-card/60 px-3 py-3 text-sm">
                <AlarmBadge level={a.level} />
                <span className="hud-value text-xs text-muted-foreground">{fmtTime(a.at)}</span>
                <span className="hud-value text-xs text-muted-foreground">{a.source}</span>
                <span className="min-w-40 flex-1">{a.message}</span>
                {a.batchNo && <span className="hud-value text-xs text-info">{a.batchNo}</span>}
                {a.ackBy ? (
                  <span className="text-xs text-muted-foreground">รับทราบโดย {a.ackBy}</span>
                ) : (
                  <button onClick={() => actions.ackAlarm(a.id)} className="rounded-md border border-border px-2 py-1 text-xs">
                    รับทราบ
                  </button>
                )}
              </li>
            ))}
            {rows.length === 0 && <li className="py-10 text-center text-muted-foreground">ไม่มีการแจ้งเตือนในระดับนี้</li>}
          </ul>
        </Panel>
      </div>
    </AppShell>
  );
}
