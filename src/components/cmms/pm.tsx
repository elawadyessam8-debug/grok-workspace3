import { useMemo, useState } from "react";
import { toast } from "sonner";
import { canManagePlans, FREQUENCY_DAYS, FREQUENCY_LABEL } from "@/lib/cmms/access";
import { complianceRate, equipmentName } from "@/lib/cmms/metrics";
import { useCmms } from "@/lib/cmms/store";
import type { Frequency, PmPlan, User } from "@/lib/cmms/types";
import { daysUntil, today } from "@/lib/cmms/time";
import { Empty, Field, Modal, PageHead, Panel, PrimaryButton, SecondaryButton } from "@/components/cmms/ui";

type Bucket = "all" | "overdue" | "today" | "week" | "later";

export function PmPage({ user }: { user: User }) {
  const data = useCmms();
  const [tab, setTab] = useState<"overview" | "calendar" | "history">("overview");
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<Bucket>("all");
  const [editing, setEditing] = useState<PmPlan | "new" | null>(null);
  const [executeId, setExecuteId] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const active = data.pmPlans.filter((plan) => plan.active);
  const filtered = active.filter((plan) => {
    const text = `${plan.title} ${equipmentName(data.equipment, plan.equipmentId)} ${plan.assignedTo}`.toLowerCase();
    const diff = daysUntil(plan.nextDate);
    const bucketOk = bucket === "all" || (bucket === "overdue" && diff < 0) || (bucket === "today" && diff === 0) || (bucket === "week" && diff >= 0 && diff <= 7) || (bucket === "later" && diff > 7);
    return text.includes(query.trim().toLowerCase()) && bucketOk;
  });
  const counts = {
    total: active.length,
    today: active.filter((plan) => daysUntil(plan.nextDate) === 0).length,
    overdue: active.filter((plan) => daysUntil(plan.nextDate) < 0).length,
    week: active.filter((plan) => { const diff = daysUntil(plan.nextDate); return diff >= 0 && diff <= 7; }).length,
    compliance: complianceRate(data.pmPlans, data.pmHistory),
  };

  return (
    <div>
      <PageHead title="الصيانة الوقائية" text="خطة واحدة لكل معدة: موعد، قائمة فحص، وتنفيذ يحرّك الاستحقاق.">
        {canManagePlans(user) ? <PrimaryButton onClick={() => setEditing("new")}>إنشاء خطة</PrimaryButton> : null}
      </PageHead>
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Kpi label="الخطط" value={String(counts.total)} onClick={() => setBucket("all")} />
        <Kpi label="اليوم" value={String(counts.today)} onClick={() => setBucket("today")} />
        <Kpi label="متأخرة" value={String(counts.overdue)} onClick={() => setBucket("overdue")} />
        <Kpi label="خلال 7 أيام" value={String(counts.week)} onClick={() => setBucket("week")} />
        <Kpi label="الالتزام" value={`${counts.compliance}%`} onClick={() => setTab("history")} />
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        {(["overview", "calendar", "history"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`h-11 rounded-lg px-3 text-sm font-extrabold ${tab === item ? "bg-accent text-on-accent" : "border border-line bg-panel text-ink"}`}>
            {item === "overview" ? "نظرة عامة" : item === "calendar" ? "التقويم" : "سجل التنفيذ"}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="أقرب الاستحقاقات" action={<select className="h-11 rounded-lg border border-line bg-soft px-2 text-sm" value={bucket} onChange={(event) => setBucket(event.target.value as Bucket)}><option value="all">الكل</option><option value="overdue">متأخرة</option><option value="today">اليوم</option><option value="week">7 أيام</option><option value="later">قادمة</option></select>}>
            <input className="mb-3 h-11 w-full rounded-lg border border-line bg-soft px-3" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="بحث في الخطط أو المعدات" />
            {filtered.length === 0 ? <Empty>لا توجد خطط في هذا التصنيف</Empty> : filtered.slice().sort((a, b) => daysUntil(a.nextDate) - daysUntil(b.nextDate)).map((plan) => (
              <PlanRow key={plan.id} plan={plan} onOpen={() => setExecuteId(plan.id)} onEdit={canManagePlans(user) ? () => setEditing(plan) : undefined} />
            ))}
          </Panel>
          <Panel title="كل الخطط">
            {active.length === 0 ? <Empty>أنشئ أول خطة للبدء</Empty> : active.map((plan) => <PlanRow key={plan.id} plan={plan} onOpen={() => setExecuteId(plan.id)} onEdit={canManagePlans(user) ? () => setEditing(plan) : undefined} />)}
          </Panel>
        </div>
      ) : null}
      {tab === "calendar" ? <Calendar plans={active} selected={day} onSelect={setDay} onExecute={setExecuteId} /> : null}
      {tab === "history" ? (
        <Panel title="سجل التنفيذ">
          <p className="mb-3 text-sm text-muted">الالتزام = التنفيذ في الموعد ÷ (كل التنفيذات + الخطط المتأخرة الآن). الحالي {counts.compliance}%.</p>
          {data.pmHistory.length === 0 ? <Empty>لا يوجد تنفيذ بعد</Empty> : data.pmHistory.map((item) => (
            <article key={item.id} className="mb-2 border-s-4 border-accent bg-soft p-3 text-sm">
              <b>{item.title}</b>
              <p className="text-muted">{equipmentName(data.equipment, item.equipmentId)} · {item.date} · {item.technician} · {item.onTime ? "في الموعد" : "بعد الموعد"}</p>
              {item.note ? <p>{item.note}</p> : null}
            </article>
          ))}
        </Panel>
      ) : null}
      {editing ? <PlanForm plan={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
      {executeId ? <ExecutePlan id={executeId} onClose={() => setExecuteId(null)} /> : null}
    </div>
  );
}

function Kpi({ label, value, onClick }: { label: string; value: string; onClick: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-line bg-panel p-3 text-start shadow-sm"><small className="text-xs font-bold text-muted">{label}</small><b className="mt-1 block text-2xl">{value}</b></button>;
}

function PlanRow({ plan, onOpen, onEdit }: { plan: PmPlan; onOpen: () => void; onEdit?: () => void }) {
  const equipment = useCmms((state) => state.equipment);
  const diff = daysUntil(plan.nextDate);
  const label = diff < 0 ? "متأخرة" : diff === 0 ? "اليوم" : diff <= 7 ? "خلال أسبوع" : "مجدولة";
  const tone = diff < 0 || diff === 0 ? "bg-danger/10 text-danger" : diff <= 7 ? "bg-warn/15 text-warn" : "bg-good/10 text-good";
  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-line p-3">
      <div className="min-w-0 flex-1">
        <b className="block text-sm">{plan.title}</b>
        <small className="text-xs text-muted">{equipmentName(equipment, plan.equipmentId)} · {plan.nextDate} · {FREQUENCY_LABEL[plan.frequency]}</small>
      </div>
      <span className={`rounded-full px-2 py-1 text-xs font-extrabold ${tone}`}>{label}</span>
      <SecondaryButton onClick={onOpen}>تنفيذ</SecondaryButton>
      {onEdit ? <SecondaryButton onClick={onEdit}>تعديل</SecondaryButton> : null}
    </div>
  );
}

function Calendar({ plans, selected, onSelect, onExecute }: { plans: PmPlan[]; selected: string | null; onSelect: (day: string) => void; onExecute: (id: string) => void }) {
  const equipment = useCmms((state) => state.equipment);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const count = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 1) % 7;
  const names = ["السبت", "الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
  const cells = [...Array(offset).fill(null), ...Array.from({ length: count }, (_, index) => index + 1)];
  const selectedPlans = plans.filter((plan) => plan.nextDate === selected);
  return (
    <Panel title={`تقويم ${now.toLocaleDateString("ar-EG-u-nu-latn", { month: "long", year: "numeric" })}`}>
      <div className="grid grid-cols-7 gap-1">
        {names.map((name) => <div key={name} className="p-1 text-center text-xs font-extrabold text-muted">{name}</div>)}
        {cells.map((value, index) => {
          if (!value) return <div key={`e-${index}`} />;
          const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(value).padStart(2, "0")}`;
          const hits = plans.filter((plan) => plan.nextDate === iso);
          return (
            <button key={iso} type="button" onClick={() => onSelect(iso)} className={`min-h-16 rounded-lg border p-1 text-start ${selected === iso ? "border-accent bg-accent/10" : "border-line bg-panel"}`}>
              <b className="text-xs">{value}</b>
              {hits.slice(0, 2).map((plan) => <span key={plan.id} className="mt-1 block truncate rounded bg-soft px-1 text-xs text-accent">{plan.title}</span>)}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {!selected ? <p className="text-sm text-muted">اختر يومًا لعرض خططه</p> : selectedPlans.length === 0 ? <Empty>لا توجد صيانة في هذا اليوم</Empty> : selectedPlans.map((plan) => (
          <div key={plan.id} className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm">{plan.title} · {equipmentName(equipment, plan.equipmentId)}</span>
            <SecondaryButton onClick={() => onExecute(plan.id)}>تنفيذ</SecondaryButton>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function PlanForm({ plan, onClose }: { plan: PmPlan | null; onClose: () => void }) {
  const data = useCmms();
  const [equipmentId, setEquipmentId] = useState(plan?.equipmentId ?? data.equipment[0]?.id ?? "");
  const [title, setTitle] = useState(plan?.title ?? "");
  const [frequency, setFrequency] = useState<Frequency>(plan?.frequency ?? "monthly");
  const [intervalDays, setIntervalDays] = useState(plan?.intervalDays ?? 30);
  const [nextDate, setNextDate] = useState(plan?.nextDate ?? today());
  const [assignedTo, setAssignedTo] = useState(plan?.assignedTo ?? "");
  const [tasks, setTasks] = useState<string[]>(plan?.tasks ?? ["فحص بصري"]);
  return (
    <Modal title={plan ? "تعديل خطة" : "إنشاء خطة"} onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        const message = data.savePlan({ id: plan?.id, equipmentId, title, frequency, intervalDays, nextDate, assignedTo, tasks });
        if (message) return toast.error(message);
        toast.success("تم حفظ الخطة");
        onClose();
      }}>
        <Field label="المعدة"><select value={equipmentId} onChange={(event) => setEquipmentId(event.target.value)}>{data.equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label="اسم الخطة"><input value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="التكرار"><select value={frequency} onChange={(event) => { const next = event.target.value as Frequency; setFrequency(next); setIntervalDays(FREQUENCY_DAYS[next]); }}>{(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((item) => <option key={item} value={item}>{FREQUENCY_LABEL[item]}</option>)}</select></Field>
          <Field label="كل (يوم)"><input type="number" min={1} value={intervalDays} onChange={(event) => setIntervalDays(Number(event.target.value))} /></Field>
          <Field label="الاستحقاق"><input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></Field>
        </div>
        <Field label="المسؤول"><input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} /></Field>
        <div className="mb-3">
          <div className="mb-2 flex items-center justify-between"><b className="text-xs">قائمة الفحص</b><button type="button" className="text-xs font-extrabold text-accent" onClick={() => setTasks([...tasks, ""])}>إضافة بند</button></div>
          {tasks.map((task, index) => (
            <div key={index} className="mb-2 flex gap-2">
              <input className="h-11 flex-1 rounded-lg border border-line bg-soft px-3" value={task} onChange={(event) => setTasks(tasks.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} />
              <SecondaryButton onClick={() => setTasks(tasks.filter((_, itemIndex) => itemIndex !== index))}>حذف</SecondaryButton>
            </div>
          ))}
        </div>
        <PrimaryButton type="submit">حفظ الخطة</PrimaryButton>
      </form>
    </Modal>
  );
}

function ExecutePlan({ id, onClose }: { id: string; onClose: () => void }) {
  const data = useCmms();
  const plan = data.pmPlans.find((item) => item.id === id);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [note, setNote] = useState("");
  const tasks = plan?.tasks ?? [];
  const ready = useMemo(() => tasks.every((_, index) => checked[index]), [tasks, checked]);
  if (!plan) return null;
  return (
    <Modal title="تنفيذ الخطة" onClose={onClose}>
      <p className="mb-3 text-sm">{plan.title} · {equipmentName(data.equipment, plan.equipmentId)} · الاستحقاق {plan.nextDate}</p>
      {tasks.map((task, index) => (
        <label key={index} className="mb-2 flex min-h-11 items-center gap-2 rounded-lg border border-line px-3 text-sm">
          <input type="checkbox" className="size-4" checked={!!checked[index]} onChange={(event) => setChecked({ ...checked, [index]: event.target.checked })} />
          {task}
        </label>
      ))}
      <Field label="ملاحظة"><textarea value={note} onChange={(event) => setNote(event.target.value)} /></Field>
      <PrimaryButton disabled={!ready} onClick={() => {
        const message = data.executePlan(plan.id, note);
        if (message) return toast.error(message);
        toast.success("تم تسجيل التنفيذ وتحريك الموعد");
        onClose();
      }}>تأكيد التنفيذ</PrimaryButton>
    </Modal>
  );
}
