import { useEffect, useState } from "react";
import { toast } from "sonner";
import { downloadText } from "@/lib/cmms/files";
import { equipmentName, summarize } from "@/lib/cmms/metrics";
import { useCmms } from "@/lib/cmms/store";
import type { User } from "@/lib/cmms/types";
import { canSee } from "@/lib/cmms/access";
import { formatMinutes, formatWhen, minutesBetween, today } from "@/lib/cmms/time";
import { Empty, Field, PageHead, Panel, PrimaryButton, SecondaryButton } from "@/components/cmms/ui";

export function ReportsPage({ user }: { user: User }) {
  const data = useCmms();
  const allowed = canSee(user, data.permissions, "reports");
  const [from, setFrom] = useState(data.reportFrom);
  const [to, setTo] = useState(data.reportTo);
  const [dailyDate, setDailyDate] = useState(today());
  const [dailyEq, setDailyEq] = useState("");
  const [equipmentId, setEquipmentId] = useState(data.equipment[0]?.id ?? "");
  if (!allowed) {
    return (
      <div>
        <PageHead title="التقارير" text="مؤشرات الفترة المحددة." />
        <Panel title="غير متاح"><p className="font-bold text-danger">ليس لديك صلاحية التقارير. يمكن للمسؤول تفعيلها من المستخدمين.</p></Panel>
      </div>
    );
  }
  const summary = summarize(data.breakdowns, data.reportFrom, data.reportTo);
  const chart = data.equipment.map((item) => ({
    name: item.name,
    count: summary.rows.filter((row) => row.equipmentId === item.id).length,
  })).filter((item) => item.count > 0);
  const one = summarize(data.breakdowns.filter((item) => item.equipmentId === equipmentId), data.reportFrom, data.reportTo);
  const daily = data.breakdowns.filter((item) => item.start.slice(0, 10) === dailyDate && (!dailyEq || item.equipmentId === dailyEq));
  const dailyDown = daily.filter((item) => item.status === "closed").reduce((sum, item) => sum + minutesBetween(item.start, item.end), 0);

  return (
    <div>
      <PageHead title="مؤشرات الأداء والتقارير" text="MTTR وMTBF والتوقف محسوبان على الفترة التي تحددها، وليس على أرقام ثابتة." />
      <Panel title="فترة التقرير">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="من"><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></Field>
          <Field label="إلى"><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></Field>
        </div>
        <div className="flex flex-wrap gap-2">
          <PrimaryButton onClick={() => {
            const message = data.setReportRange(from, to);
            if (message) toast.error(message);
            else toast.success("تم تطبيق الفترة");
          }}>تطبيق الفترة</PrimaryButton>
          <SecondaryButton onClick={() => exportSummary(data.equipment, data.breakdowns, data.reportFrom, data.reportTo)}>تصدير Excel</SecondaryButton>
        </div>
      </Panel>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="الأعطال" value={String(summary.failures)} />
        <Stat label="مفتوحة / مغلقة" value={`${summary.open} / ${summary.closed.length}`} />
        <Stat label="التوقف" value={formatMinutes(summary.down)} />
        <Stat label="MTTR / MTBF" value={`${summary.mttr} د · ${summary.mtbf} س`} />
      </div>
      <Panel title="الأعطال حسب المعدة">
        <FaultChart data={chart} />
      </Panel>
      <Panel title="تقرير معدة">
        <Field label="المعدة">
          <select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)}>
            {data.equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <p className="text-sm">الأعطال {one.failures} · المفتوحة {one.open} · التوقف {formatMinutes(one.down)} · MTTR {one.mttr} د · MTBF {one.mtbf} س</p>
      </Panel>
      <Panel title="تقرير الأعطال اليومية" action={<SecondaryButton onClick={() => window.print()}>طباعة</SecondaryButton>}>
        <div id="daily-report">
          <div className="mb-3 grid gap-3 sm:grid-cols-2">
            <Field label="التاريخ"><input type="date" value={dailyDate} onChange={(event) => setDailyDate(event.target.value)} /></Field>
            <Field label="المعدة">
              <select value={dailyEq} onChange={(event) => setDailyEq(event.target.value)}>
                <option value="">كل المعدات</option>
                {data.equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
          </div>
          <div className="mb-3 grid grid-cols-3 gap-2 text-center">
            <Stat label="البلاغات" value={String(daily.length)} />
            <Stat label="مفتوحة" value={String(daily.filter((item) => item.status === "open").length)} />
            <Stat label="التوقف" value={formatMinutes(dailyDown)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-soft text-start">
                  {["المعدة", "الوصف", "الفني", "البداية", "الإغلاق", "الحالة", "التوقف", "القطع"].map((head) => <th key={head} className="border border-line p-2 text-start">{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {daily.length === 0 ? <tr><td colSpan={8} className="border border-line p-4 text-center text-muted">لا توجد أعطال في هذا اليوم</td></tr> : daily.map((item) => (
                  <tr key={item.id}>
                    <td className="border border-line p-2">{equipmentName(data.equipment, item.equipmentId)}</td>
                    <td className="border border-line p-2">{item.description}</td>
                    <td className="border border-line p-2">{item.technician}</td>
                    <td className="border border-line p-2">{formatWhen(item.start)}</td>
                    <td className="border border-line p-2">{formatWhen(item.end, "—")}</td>
                    <td className="border border-line p-2">{item.status === "open" ? "مفتوح" : "مغلق"}</td>
                    <td className="border border-line p-2">{item.end ? formatMinutes(minutesBetween(item.start, item.end)) : "—"}</td>
                    <td className="border border-line p-2">{item.usedParts.map((part) => `${part.name} (${part.qty})`).join("، ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line bg-panel p-3 shadow-sm"><small className="text-xs font-bold text-muted">{label}</small><b className="mt-1 block text-xl">{value}</b></div>;
}

function FaultChart({ data }: { data: { name: string; count: number }[] }) {
  const [lib, setLib] = useState<typeof import("recharts") | null>(null);
  useEffect(() => {
    let live = true;
    void import("recharts").then((module) => { if (live) setLib(module); });
    return () => { live = false; };
  }, []);
  if (data.length === 0) return <Empty>لا توجد أعطال داخل الفترة</Empty>;
  if (!lib) return <div className="h-60 rounded-lg bg-soft" />;
  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } = lib;
  return (
    <div className="h-60">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <XAxis dataKey="name" tick={{ fill: "var(--color-muted)", fontSize: 11 }} interval={0} />
          <YAxis allowDecimals={false} tick={{ fill: "var(--color-muted)", fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey="count" name="الأعطال" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function exportSummary(equipment: { id: string; name: string }[], breakdowns: Parameters<typeof summarize>[0], from: string, to: string) {
  const rows = [["المعدة", "عدد الأعطال", "مفتوحة", "التوقف بالدقائق", "MTTR", "MTBF"]];
  equipment.forEach((item) => {
    const summary = summarize(breakdowns.filter((row) => row.equipmentId === item.id), from, to);
    rows.push([item.name, String(summary.failures), String(summary.open), String(summary.down), String(summary.mttr), String(summary.mtbf)]);
  });
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(",")).join("\n")}`;
  downloadText(`maintenance-${from}-${to}.csv`, csv, "text/csv;charset=utf-8");
}
