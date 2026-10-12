import { useState } from "react";
import { toast } from "sonner";
import { Cog } from "lucide-react";
import { canManageAssets } from "@/lib/cmms/access";
import { compressImage, readDataUrl } from "@/lib/cmms/files";
import { useCmms } from "@/lib/cmms/store";
import type { Equipment, User } from "@/lib/cmms/types";
import { Empty, Field, Modal, PageHead, Panel, PrimaryButton, SecondaryButton, StatusPill } from "@/components/cmms/ui";

export function EquipmentPage({ user }: { user: User }) {
  const data = useCmms();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [model, setModel] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState<Equipment | null>(null);
  const [edit, setEdit] = useState<Equipment | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const manage = canManageAssets(user);

  async function saveNew(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const files = await readFiles(imageFile, pdfFile);
      if (files.error) return toast.error(files.error);
      const message = data.addEquipment({ name, code, model, image: files.image, pdfName: files.pdfName, pdfData: files.pdfData });
      if (message) return toast.error(message);
      setName("");
      setCode("");
      setModel("");
      setImageFile(null);
      setPdfFile(null);
      toast.success("تم حفظ المعدة");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <PageHead title="سجل الأصول والمعدات" text="كل معدة بكودها وصورتها وكتالوجها وقطعها المرتبطة." />
      {manage ? (
        <Panel title="إضافة معدة">
          <form onSubmit={(event) => void saveNew(event)}>
            <Field label="اسم المعدة"><input value={name} onChange={(event) => setName(event.target.value)} placeholder="ماكينة التعبئة 02" /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="الكود"><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="EQ-102" /></Field>
              <Field label="الموديل والقسم"><input value={model} onChange={(event) => setModel(event.target.value)} placeholder="خط التعبئة ب" /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="صورة المعدة"><input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></Field>
              <Field label="كتالوج PDF حتى 1.2 ميغابايت"><input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} /></Field>
            </div>
            <PrimaryButton type="submit" disabled={pending}>{pending ? "جاري الحفظ" : "حفظ المعدة"}</PrimaryButton>
          </form>
        </Panel>
      ) : null}
      {data.equipment.length === 0 ? <Empty>لا توجد معدات مسجلة</Empty> : data.equipment.map((item) => {
        const linked = data.parts.filter((part) => part.equipmentIds.includes(item.id)).length;
        return (
          <article key={item.id} className="mb-3 flex items-center gap-3 rounded-xl border border-line bg-panel p-3 shadow-sm">
            <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-start" onClick={() => setOpen(item)}>
              <Thumb equipment={item} />
              <span className="min-w-0">
                <b className="block truncate">{item.name}</b>
                <small className="text-xs text-muted">{item.code || "بدون كود"} · {item.model || "بدون قسم"} · {linked} قطع</small>
              </span>
            </button>
            <SecondaryButton onClick={() => setOpen(item)}>التفاصيل</SecondaryButton>
          </article>
        );
      })}
      {open ? <EquipmentDetail equipment={open} user={user} onClose={() => setOpen(null)} onEdit={() => { setEdit(open); setOpen(null); }} onDelete={() => { setRemoveId(open.id); setOpen(null); }} /> : null}
      {edit ? <EditEquipment equipment={edit} onClose={() => setEdit(null)} /> : null}
      {removeId ? (
        <Modal title="إزالة المعدة" onClose={() => setRemoveId(null)}>
          <p className="mb-4 text-sm">ستُحذف المعدة من السجل ويُفك ارتباطها بقطع الغيار. سجل الأعطال يبقى محفوظًا.</p>
          <SecondaryButton danger onClick={() => {
            const message = data.deleteEquipment(removeId);
            if (message) toast.error(message);
            else toast.success("تمت إزالة المعدة");
            setRemoveId(null);
          }}>تأكيد الإزالة</SecondaryButton>
        </Modal>
      ) : null}
    </div>
  );
}

function EquipmentDetail({ equipment, user, onClose, onEdit, onDelete }: { equipment: Equipment; user: User; onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const data = useCmms();
  const parts = data.parts.filter((part) => part.equipmentIds.includes(equipment.id));
  const faults = data.breakdowns.filter((item) => item.equipmentId === equipment.id);
  const plans = data.pmPlans.filter((plan) => plan.equipmentId === equipment.id);
  return (
    <Modal title="تفاصيل المعدة" onClose={onClose} wide>
      <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
        <Thumb equipment={equipment} large />
        <div>
          <h4 className="text-xl font-extrabold">{equipment.name}</h4>
          <p className="text-sm text-muted">الكود: {equipment.code || "—"} · {equipment.model || "—"}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {canManageAssets(user) ? <SecondaryButton onClick={onEdit}>تعديل</SecondaryButton> : null}
            {user.role === "admin" ? <SecondaryButton danger onClick={onDelete}>إزالة</SecondaryButton> : null}
          </div>
        </div>
      </div>
      <div className="my-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="الأعطال" value={faults.length} />
        <Stat label="مفتوحة" value={faults.filter((item) => item.status === "open").length} />
        <Stat label="خطط PM" value={plans.length} />
        <Stat label="قطع مرتبطة" value={parts.length} />
      </div>
      {equipment.pdfData ? <a className="mb-3 inline-flex font-bold text-accent" href={equipment.pdfData} download={equipment.pdfName || "catalog.pdf"}>تنزيل كتالوج PDF</a> : <p className="mb-3 text-sm text-muted">لا يوجد كتالوج</p>}
      <h4 className="mb-2 font-extrabold">قطع الغيار</h4>
      {canManageAssets(user) ? <PartLinker equipmentId={equipment.id} /> : parts.length === 0 ? <Empty>لا توجد قطع مرتبطة</Empty> : null}
      {!canManageAssets(user) && parts.map((part) => <p key={part.id} className="border-b border-line py-2 text-sm">{part.name} · في الماكينة {part.machineQty[equipment.id] ?? 0} · المخزن {part.qty}</p>)}
      <h4 className="mb-2 mt-4 font-extrabold">آخر الأعطال</h4>
      {faults.slice(0, 5).map((item) => (
        <div key={item.id} className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-soft p-3">
          <span className="text-sm">{item.description}</span>
          <StatusPill status={item.status} />
        </div>
      ))}
      {faults.length === 0 ? <Empty>لا توجد أعطال لهذه المعدة</Empty> : null}
    </Modal>
  );
}

function PartLinker({ equipmentId }: { equipmentId: string }) {
  const data = useCmms();
  if (data.parts.length === 0) return <Empty>أضف قطع غيار أولًا ثم اربطها من هنا</Empty>;
  return (
    <div className="grid gap-2">
      {data.parts.map((part) => {
        const linked = part.equipmentIds.includes(equipmentId);
        return (
          <div key={part.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line p-2">
            <span className="min-w-0 flex-1 text-sm font-bold">{part.name}<small className="block font-normal text-muted">مخزن {part.qty}</small></span>
            {linked ? <input className="field h-11 w-24 rounded-lg border border-line bg-soft px-2" type="number" min={0} value={part.machineQty[equipmentId] ?? 0} onChange={(event) => data.setMachineQty(part.id, equipmentId, Number(event.target.value))} aria-label="عددها في الماكينة" /> : null}
            <SecondaryButton onClick={() => data.togglePartLink(part.id, equipmentId)}>{linked ? "فك الربط" : "ربط"}</SecondaryButton>
          </div>
        );
      })}
    </div>
  );
}

function EditEquipment({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const update = useCmms((state) => state.updateEquipment);
  const [name, setName] = useState(equipment.name);
  const [code, setCode] = useState(equipment.code);
  const [model, setModel] = useState(equipment.model);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <Modal title="تعديل المعدة" onClose={onClose}>
      <form onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void (async () => {
          try {
            const files = await readFiles(imageFile, pdfFile);
            if (files.error) return toast.error(files.error);
            const message = update(equipment.id, {
              name,
              code,
              model,
              image: files.image || undefined,
              pdfName: files.pdfName || undefined,
              pdfData: files.pdfData || undefined,
            });
            if (message) return toast.error(message);
            toast.success("تم حفظ التعديل");
            onClose();
          } finally {
            setPending(false);
          }
        })();
      }}>
        <Field label="اسم المعدة"><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
        <Field label="الكود"><input value={code} onChange={(event) => setCode(event.target.value)} /></Field>
        <Field label="الموديل والقسم"><input value={model} onChange={(event) => setModel(event.target.value)} /></Field>
        <Field label="صورة جديدة (اختياري)"><input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></Field>
        <Field label="كتالوج جديد (اختياري)"><input type="file" accept="application/pdf" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} /></Field>
        <PrimaryButton type="submit" disabled={pending}>حفظ التعديل</PrimaryButton>
      </form>
    </Modal>
  );
}

function Thumb({ equipment, large }: { equipment: Equipment; large?: boolean }) {
  const className = large ? "h-40 w-full overflow-hidden rounded-xl bg-soft" : "grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-soft text-muted";
  if (!equipment.image) return <span className={className}><Cog className="size-5" /></span>;
  return <span className={className}><img src={equipment.image} alt="" className="size-full object-cover" /></span>;
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg bg-soft p-3"><small className="text-xs text-muted">{label}</small><b className="block text-xl">{value}</b></div>;
}

async function readFiles(imageFile: File | null, pdfFile: File | null) {
  if (imageFile && imageFile.size > 10 * 1024 * 1024) return { error: "حجم الصورة الأصلية أكبر من 10 ميغابايت", image: "", pdfName: "", pdfData: "" };
  if (pdfFile && pdfFile.size > 1_200_000) return { error: "ملف PDF أكبر من 1.2 ميغابايت حتى لا تمتلئ ذاكرة الجهاز", image: "", pdfName: "", pdfData: "" };
  try {
    const image = imageFile ? await compressImage(imageFile) : "";
    const pdfData = pdfFile ? await readDataUrl(pdfFile) : "";
    return { error: "", image, pdfName: pdfFile?.name ?? "", pdfData };
  } catch {
    return { error: "تعذر تجهيز الملفات", image: "", pdfName: "", pdfData: "" };
  }
}
