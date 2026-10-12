import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { canLogBreakdown, canSee, PRIORITY_LABEL } from "@/lib/cmms/access";
import { equipmentName } from "@/lib/cmms/metrics";
import { useCmms } from "@/lib/cmms/store";
import type { Priority, User } from "@/lib/cmms/types";
import { formatMinutes, formatWhen, minutesBetween, nowLocal } from "@/lib/cmms/time";
import { Empty, Field, Modal, PageHead, Panel, PrimaryButton, PriorityPill, SecondaryButton, StatusPill } from "@/components/cmms/ui";

export function BreakdownsPage({ user }: { user: User }) {
  const data = useCmms();
  const [equipmentId, setEquipmentId] = useState(data.equipment[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [cause, setCause] = useState("");
  const [action, setAction] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [start, setStart] = useState(nowLocal());
  const [end, setEnd] = useState("");
  const [picked, setPicked] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const focus = data.focus;
  const canLog = canLogBreakdown(user) && canSee(user, data.permissions, "breakdowns");

  useEffect(() => {
    if (focus?.kind === "breakdown") {
      setOpenId(focus.id);
      data.markRead(data.notifications.find((item) => item.breakdownId === focus.id)?.id ?? "");
      data.setFocus(null);
    }
  }, [focus, data]);

  const partChoices = useMemo(
    () => data.parts.filter((part) => part.equipmentIds.length === 0 || part.equipmentIds.includes(equipmentId)),
    [data.parts, equipmentId],
  );
  const rows = data.breakdowns.filter((item) => filter === "all" || item.equipmentId === filter);
  const current = data.breakdowns.find((item) => item.id === openId) ?? null;

  return (
    <div>
      <PageHead title="بلاغات الأعطال" text="التسجيل يخصم قطع الغيار ويفتح أمر شغل تلقائيًا." />
      {canLog ? (
        <Panel title="تسجيل بلاغ">
          <form onSubmit={(event) => {
            event.preventDefault();
            const used = Object.entries(picked).filter(([, qty]) => qty > 0).map(([partId, qty]) => {
              const part = data.parts.find((item) => item.id === partId);
              return { partId, name: part?.name ?? "", storeNo: part?.storeNo ?? "", qty };
            });
            const message = data.addBreakdown({ equipmentId, description, cause, action, priority, start, end, used });
            if (message) return toast.error(message);
            setDescription("");
            setCause("");
            setAction("");
            setEnd("");
            setPicked({});
            toast.success("تم تسجيل العطل");
          }}>
            <Field label="المعدة">
              <select value={equipmentId} onChange={(event) => { setEquipmentId(event.target.value); setPicked({}); }}>
                {data.equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </Field>
            <Field label="وصف العطل"><input value={description} onChange={(event) => setDescription(event.target.value)} /></Field>
            <Field label="السبب المبدئي"><input value={cause} onChange={(event) => setCause(event.target.value)} /></Field>
            <Field label="الفني"><input value={user.name} readOnly /></Field>
            <Field label="قطع الغيار المستخدمة">
              <div className="grid gap-2">
                {partChoices.length === 0 ? <span className="text-sm text-muted">لا توجد قطع مرتبطة أو عامة</span> : partChoices.map((part) => (
                  <label key={part.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={picked[part.id] !== undefined} onChange={(event) => {
                      setPicked((currentPicked) => {
                        const next = { ...currentPicked };
                        if (event.target.checked) next[part.id] = 1;
                        else delete next[part.id];
                        return next;
                      });
                    }} />
                    <span className="flex-1">{part.name} · متاح {part.qty}</span>
                    {picked[part.id] !== undefined ? <input className="h-11 w-20 rounded-lg border border-line bg-panel px-2" type="number" min={1} value={picked[part.id]} onChange={(event) => setPicked((currentPicked) => ({ ...currentPicked, [part.id]: Number(event.target.value) }))} /> : null}
                  </label>
                ))}
              </div>
            </Field>
            <Field label="الإجراء"><textarea value={action} onChange={(event) => setAction(event.target.value)} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="البداية"><input type="datetime-local" value={start} onChange={(event) => setStart(event.target.value)} /></Field>
              <Field label="الإغلاق (اختياري)"><input type="datetime-local" value={end} onChange={(event) => setEnd(event.target.value)} /></Field>
              <Field label="الأولوية">
                <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                  {(Object.keys(PRIORITY_LABEL) as Priority[]).map((item) => <option key={item} value={item}>{PRIORITY_LABEL[item]}</option>)}
                </select>
              </Field>
            </div>
            <PrimaryButton type="submit" disabled={data.equipment.length === 0}>حفظ العطل</PrimaryButton>
          </form>
        </Panel>
      ) : <Panel title="التسجيل"><p className="text-sm text-muted">تسجيل الأعطال متاح للمسؤول والفني. المشرف يتابع ويغلق.</p></Panel>}
      <Panel title="سجل الأعطال" action={
        <select className="h-11 rounded-lg border border-line bg-soft px-2 text-sm" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">كل المعدات</option>
          {data.equipment.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      }>
        {rows.length === 0 ? <Empty>لا توجد أعطال</Empty> : rows.map((item) => (
          <article key={item.id} className="mb-2 flex items-center gap-3 rounded-lg border border-line p-3">
            <div className="min-w-0 flex-1">
              <b className="block truncate">{equipmentName(data.equipment, item.equipmentId)}</b>
              <p className="truncate text-sm text-muted">{item.description} · {item.technician}</p>
            </div>
            <PriorityPill priority={item.priority} />
            <StatusPill status={item.status} />
            <SecondaryButton onClick={() => setOpenId(item.id)}>التفاصيل</SecondaryButton>
          </article>
        ))}
      </Panel>
      {current ? (
        <Modal title="تفاصيل العطل" onClose={() => setOpenId(null)}>
          <p className="mb-1 text-sm"><b>المعدة: </b>{equipmentName(data.equipment, current.equipmentId)}</p>
          <p className="mb-1 text-sm"><b>الوصف: </b>{current.description}</p>
          <p className="mb-1 text-sm"><b>السبب: </b>{current.cause || "غير مسجل"}</p>
          <p className="mb-1 text-sm"><b>الإجراء: </b>{current.action || "لم يُسجل"}</p>
          <p className="mb-1 text-sm"><b>الفني: </b>{current.technician}</p>
          <p className="mb-1 text-sm"><b>البداية: </b>{formatWhen(current.start)} · <b>الإغلاق: </b>{formatWhen(current.end, "لم يُغلق")}</p>
          <p className="mb-3 text-sm"><b>التوقف: </b>{current.end ? formatMinutes(minutesBetween(current.start, current.end)) : "—"}</p>
          <div className="mb-3 flex gap-2"><StatusPill status={current.status} /><PriorityPill priority={current.priority} /></div>
          <h4 className="mb-1 font-extrabold">قطع الغيار</h4>
          {current.usedParts.length === 0 ? <p className="text-sm text-muted">لم تُستخدم قطع</p> : current.usedParts.map((part) => <p key={part.partId} className="text-sm">{part.name} · {part.qty} · {part.storeNo}</p>)}
          {current.status === "open" ? <div className="mt-4"><PrimaryButton onClick={() => {
            const message = data.closeBreakdown(current.id);
            if (message) toast.error(message);
            else { toast.success("تم إغلاق العطل وأمر الشغل"); setOpenId(null); }
          }}>إنهاء وإغلاق العطل</PrimaryButton></div> : null}
        </Modal>
      ) : null}
    </div>
  );
}

export function WorkOrdersPage() {
  const data = useCmms();
  const [openId, setOpenId] = useState<string | null>(null);
  const current = data.workOrders.find((item) => item.id === openId) ?? null;
  const fault = data.breakdowns.find((item) => item.id === current?.breakdownId);
  return (
    <div>
      <PageHead title="أوامر الشغل" text="يُنشأ أمر لكل عطل، وتُغلق الحالة مع إغلاق البلاغ." />
      {data.workOrders.length === 0 ? <Empty>لا توجد أوامر شغل</Empty> : data.workOrders.map((item) => (
        <button key={item.id} type="button" onClick={() => setOpenId(item.id)} className="mb-2 flex w-full items-center gap-3 rounded-xl border border-line bg-panel p-3 text-start shadow-sm">
          <span className="min-w-0 flex-1">
            <b className="block">{item.number}</b>
            <small className="text-xs text-muted">{equipmentName(data.equipment, item.equipmentId)} · {item.technician}</small>
          </span>
          <PriorityPill priority={item.priority} />
          <StatusPill status={item.status} />
        </button>
      ))}
      {current ? (
        <Modal title={current.number} onClose={() => setOpenId(null)}>
          <p className="mb-1 text-sm"><b>المعدة: </b>{equipmentName(data.equipment, current.equipmentId)}</p>
          <p className="mb-1 text-sm"><b>الفني: </b>{current.technician}</p>
          <p className="mb-1 text-sm"><b>أُنشئ: </b>{formatWhen(current.createdAt)}</p>
          <p className="mb-3 text-sm"><b>وصف العطل: </b>{fault?.description || "—"}</p>
          <StatusPill status={current.status} />
          {fault && fault.status === "open" ? <div className="mt-4"><PrimaryButton onClick={() => {
            const message = data.closeBreakdown(fault.id);
            if (message) toast.error(message);
            else toast.success("تم إغلاق أمر الشغل");
          }}>إغلاق الأمر</PrimaryButton></div> : null}
        </Modal>
      ) : null}
    </div>
  );
}
