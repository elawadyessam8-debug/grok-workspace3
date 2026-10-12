import { useState } from "react";
import { toast } from "sonner";
import { canManageParts } from "@/lib/cmms/access";
import { equipmentName, isCritical } from "@/lib/cmms/metrics";
import { useCmms } from "@/lib/cmms/store";
import type { User } from "@/lib/cmms/types";
import { Empty, Field, PageHead, Panel, PrimaryButton } from "@/components/cmms/ui";

export function PartsPage({ user }: { user: User }) {
  const data = useCmms();
  const [name, setName] = useState("");
  const [storeNo, setStoreNo] = useState("");
  const [qty, setQty] = useState(5);
  const [minQty, setMinQty] = useState(2);
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const manage = canManageParts(user);
  const rows = data.parts.filter((part) => {
    const text = `${part.name} ${part.storeNo} ${part.equipmentIds.map((id) => equipmentName(data.equipment, id)).join(" ")}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  return (
    <div>
      <PageHead title="المخزون وقطع الغيار" text="القطع الحرجة هي التي وصل رصيدها إلى حد إعادة الطلب أو أقل." />
      {manage ? (
        <Panel title="إضافة قطعة">
          <form onSubmit={(event) => {
            event.preventDefault();
            const message = data.addPart({ name, storeNo, qty, minQty, equipmentIds: picked });
            if (message) return toast.error(message);
            setName("");
            setStoreNo("");
            setPicked([]);
            toast.success("تمت إضافة القطعة");
          }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="اسم القطعة"><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
              <Field label="رقم المخزن"><input value={storeNo} onChange={(event) => setStoreNo(event.target.value)} /></Field>
              <Field label="الرصيد"><input type="number" min={0} value={qty} onChange={(event) => setQty(Number(event.target.value))} /></Field>
              <Field label="حد إعادة الطلب"><input type="number" min={0} value={minQty} onChange={(event) => setMinQty(Number(event.target.value))} /></Field>
            </div>
            <Field label="المعدات المرتبطة">
              <div className="grid gap-2 sm:grid-cols-2">
                {data.equipment.map((item) => (
                  <label key={item.id} className="flex min-h-11 items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4" checked={picked.includes(item.id)} onChange={(event) => setPicked(event.target.checked ? [...picked, item.id] : picked.filter((id) => id !== item.id))} />
                    {item.name}
                  </label>
                ))}
              </div>
            </Field>
            <PrimaryButton type="submit">إضافة القطعة</PrimaryButton>
          </form>
        </Panel>
      ) : null}
      <Panel title="البحث">
        <input className="h-11 w-full rounded-lg border border-line bg-soft px-3" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="اسم القطعة أو رقم المخزن" />
      </Panel>
      {rows.length === 0 ? <Empty>لا توجد نتائج</Empty> : rows.map((part) => {
        const names = part.equipmentIds.length ? part.equipmentIds.map((id) => equipmentName(data.equipment, id)).join("، ") : "عامة / غير مرتبطة";
        const critical = isCritical(part);
        return (
          <article key={part.id} className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-panel p-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <b className="block">{part.name}</b>
              <p className="text-sm text-muted">رقم المخزن {part.storeNo} · الرصيد {part.qty} · الحد {part.minQty}</p>
              <p className="text-xs text-muted">{names}</p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${critical ? "bg-danger/10 text-danger" : "bg-good/10 text-good"}`}>{critical ? "حرجة" : `الرصيد ${part.qty}`}</span>
          </article>
        );
      })}
    </div>
  );
}
