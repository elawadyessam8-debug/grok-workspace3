import { useCmms } from "@/lib/cmms/store";
import type { User } from "@/lib/cmms/types";
import { canLogBreakdown, canSee } from "@/lib/cmms/access";
import { equipmentName, isCritical, lifetimeMetrics, pmDueCount } from "@/lib/cmms/metrics";
import { formatMinutes, greeting } from "@/lib/cmms/time";
import { Empty, PageHead, Panel, PrimaryButton, PriorityPill } from "@/components/cmms/ui";

export function HomePage({ user }: { user: User }) {
  const data = useCmms();
  const open = data.breakdowns.filter((item) => item.status === "open");
  const metrics = lifetimeMetrics(data.breakdowns);
  const critical = data.parts.filter(isCritical).length;
  const due = pmDueCount(data.pmPlans);
  const recent = [...data.breakdowns].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4);

  const kpis = [
    { label: "أعطال مفتوحة", value: open.length, note: "تحتاج متابعة الآن", tone: "danger", section: "breakdowns" as const },
    { label: "صيانة مستحقة", value: due, note: "اليوم والمتأخرة", tone: "warn", section: "pm" as const },
    { label: "الأصول والمعدات", value: data.equipment.length, note: "معدات مسجلة", tone: "accent", section: "equipment" as const },
    { label: "قطع حرجة", value: critical, note: "عند حد إعادة الطلب أو أقل", tone: "teal", section: "parts" as const },
  ];

  return (
    <div>
      <PageHead title="مركز التشغيل" text="حالة المعدات والأعطال والصيانة في وردية واحدة.">
        {canLogBreakdown(user) && canSee(user, data.permissions, "breakdowns") ? (
          <PrimaryButton onClick={() => data.setSection("breakdowns")}>تسجيل عطل</PrimaryButton>
        ) : null}
      </PageHead>
      <section className="hero">
        <div className="hero-copy">
          <p className="text-xs font-bold tracking-widest text-navy-muted">MAINTENANCE OPERATIONS</p>
          <h3 className="mt-1 text-2xl font-extrabold">{greeting(user.name)}</h3>
          <p className="mt-1 max-w-xl text-sm text-navy-muted">تابع العطل المفتوح قبل أن يتحول التحذير إلى توقف.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">النظام يعمل</span>
            <span className="chip">البيانات على هذا الجهاز</span>
            <span className="chip">{open.length} عطل مفتوح</span>
          </div>
        </div>
      </section>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <button key={kpi.label} type="button" onClick={() => data.setSection(kpi.section)} data-tone={kpi.tone} className="kpi rounded-xl border border-line bg-panel p-4 text-start shadow-sm">
            <span className="text-xs font-bold text-muted">{kpi.label}</span>
            <b className="mt-2 block text-3xl font-extrabold text-ink">{kpi.value}</b>
            <small className="text-xs text-muted">{kpi.note}</small>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="أعطال تحتاج تدخل" action={<button type="button" className="text-xs font-extrabold text-accent" onClick={() => data.setSection("breakdowns")}>عرض الكل</button>}>
            {open.length === 0 ? <Empty>لا توجد أعطال مفتوحة</Empty> : open.slice(0, 5).map((item) => (
              <button key={item.id} type="button" className="flex w-full items-center gap-3 border-b border-line py-3 text-start last:border-0" onClick={() => { data.setFocus({ kind: "breakdown", id: item.id }); data.setSection("breakdowns"); }}>
                <i className={`size-2.5 rounded-full ${item.priority === "urgent" ? "bg-danger" : "bg-warn"}`} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-sm">{equipmentName(data.equipment, item.equipmentId)}</b>
                  <small className="block truncate text-xs text-muted">{item.description} · {item.technician}</small>
                </span>
                <PriorityPill priority={item.priority} />
              </button>
            ))}
          </Panel>
          <Panel title="مؤشرات الأعطال المغلقة">
            <div className="grid grid-cols-3 gap-2">
              <Metric label="MTTR" value={`${metrics.mttr} د`} />
              <Metric label="MTBF" value={`${metrics.mtbf} س`} />
              <Metric label="التوقف" value={formatMinutes(metrics.down)} />
            </div>
          </Panel>
        </div>
        <div>
          <Panel title="إجراءات سريعة">
            <div className="grid grid-cols-2 gap-2">
              <Quick label="تسجيل عطل" onClick={() => data.setSection("breakdowns")} />
              <Quick label="أمر شغل" onClick={() => data.setSection("workorders")} />
              <Quick label="تنفيذ PM" onClick={() => data.setSection("pm")} />
              <Quick label="المعدات" onClick={() => data.setSection("equipment")} />
              <Quick label="المخزون" onClick={() => data.setSection("parts")} />
              <Quick label="التقارير" onClick={() => data.setSection("reports")} />
            </div>
          </Panel>
          <Panel title="آخر النشاط">
            {recent.length === 0 ? <Empty>لا توجد نشاطات بعد</Empty> : recent.map((item) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                <i className={`size-2.5 rounded-full ${item.status === "open" ? "bg-danger" : "bg-good"}`} />
                <span className="min-w-0">
                  <b className="block truncate text-sm">{equipmentName(data.equipment, item.equipmentId)}</b>
                  <small className="text-xs text-muted">{item.status === "open" ? "مفتوح" : "مغلق"} · {item.start.slice(0, 10)}</small>
                </span>
              </div>
            ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-soft p-3">
      <small className="text-xs font-bold text-muted">{label}</small>
      <b className="mt-1 block text-xl font-extrabold">{value}</b>
    </div>
  );
}

function Quick({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-11 rounded-lg border border-line bg-soft px-3 text-start text-xs font-extrabold text-ink">
      {label}
    </button>
  );
}
