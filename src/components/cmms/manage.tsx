import { useState } from "react";
import { toast } from "sonner";
import { ROLE_LABEL } from "@/lib/cmms/access";
import { downloadText } from "@/lib/cmms/files";
import { formatWhen } from "@/lib/cmms/time";
import { useCmms } from "@/lib/cmms/store";
import type { PermSet, Role, User } from "@/lib/cmms/types";
import { Empty, Field, PageHead, Panel, PrimaryButton, SecondaryButton } from "@/components/cmms/ui";

const PERM_LABELS: { key: keyof PermSet; label: string }[] = [
  { key: "equipment", label: "المعدات" },
  { key: "breakdowns", label: "الأعطال" },
  { key: "pm", label: "الصيانة الوقائية" },
  { key: "parts", label: "قطع الغيار" },
  { key: "reports", label: "التقارير" },
];

export function NotificationsPage() {
  const data = useCmms();
  return (
    <div>
      <PageHead title="مركز التنبيهات" text="تنبيهات الأعطال الجديدة داخل النظام.">
        <SecondaryButton onClick={() => data.markAllRead()}>تحديد الكل كمقروء</SecondaryButton>
      </PageHead>
      {data.notifications.length === 0 ? <Empty>لا توجد تنبيهات</Empty> : data.notifications.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => {
            data.markRead(item.id);
            if (item.breakdownId) {
              data.setFocus({ kind: "breakdown", id: item.breakdownId });
              data.setSection("breakdowns");
            }
          }}
          className={`mb-2 w-full rounded-xl border p-4 text-start ${item.read ? "border-line bg-panel" : "border-accent bg-accent/5"}`}
        >
          <b className="block">{item.title}</b>
          <p className="text-sm text-muted">{item.body}</p>
          <small className="text-xs text-muted">{formatWhen(item.createdAt)}</small>
        </button>
      ))}
    </div>
  );
}

export function UsersPage({ user }: { user: User }) {
  const data = useCmms();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("technician");
  if (user.role !== "admin") {
    return <Panel title="المستخدمون"><p>هذه الصفحة للمسؤول فقط.</p></Panel>;
  }
  return (
    <div>
      <PageHead title="المستخدمون والصلاحيات" text="كلمات المرور تُحفظ مشفرة على هذا الجهاز، ولا تُعرض مرة أخرى." />
      <Panel title="مستخدم جديد">
        <form onSubmit={(event) => {
          event.preventDefault();
          void data.addUser({ name, username, password, role }).then((message) => {
            if (message) toast.error(message);
            else {
              setName("");
              setUsername("");
              setPassword("");
              toast.success("تمت إضافة المستخدم");
            }
          });
        }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="الاسم"><input value={name} onChange={(event) => setName(event.target.value)} /></Field>
            <Field label="اسم المستخدم"><input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="off" /></Field>
            <Field label="كلمة المرور"><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="new-password" /></Field>
            <Field label="الدور">
              <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                <option value="technician">فني صيانة</option>
                <option value="supervisor">مشرف صيانة</option>
                <option value="admin">مسؤول</option>
              </select>
            </Field>
          </div>
          <PrimaryButton type="submit">إضافة المستخدم</PrimaryButton>
        </form>
      </Panel>
      <Panel title="صلاحيات الأدوار">
        <PermBlock title="فني صيانة" role="technician" />
        <PermBlock title="مشرف صيانة" role="supervisor" />
        <p className="text-xs text-muted">المسؤول يرى كل الأقسام دائمًا. إخفاء قسم يخفيه من القائمة ولا يسبب خطأ في بقية الشاشات.</p>
      </Panel>
      <Panel title="الحسابات">
        {data.users.map((item) => (
          <article key={item.id} className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-line p-3">
            <span><b>{item.name}</b> <small className="text-muted">{ROLE_LABEL[item.role]} · {item.username}</small></span>
            {item.username !== "admin" && item.id !== user.id ? <SecondaryButton danger onClick={() => {
              const message = data.deleteUser(item.id);
              if (message) toast.error(message);
              else toast.success("تم حذف المستخدم");
            }}>حذف</SecondaryButton> : null}
          </article>
        ))}
      </Panel>
    </div>
  );
}

function PermBlock({ title, role }: { title: string; role: "technician" | "supervisor" }) {
  const permissions = useCmms((state) => state.permissions);
  const setPerm = useCmms((state) => state.setPerm);
  const set = permissions[role];
  return (
    <div className="mb-4">
      <h4 className="mb-2 text-sm font-extrabold">{title}</h4>
      <div className="flex flex-wrap gap-3">
        {PERM_LABELS.map((item) => (
          <label key={item.key} className="flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={!!set?.[item.key]} onChange={(event) => {
              const message = setPerm(role, item.key, event.target.checked);
              if (message) toast.error(message);
            }} />
            {item.label}
          </label>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage({ user }: { user: User }) {
  const data = useCmms();
  return (
    <div>
      <PageHead title="إعدادات النظام" text="النسخة تعمل على هذا الجهاز. لا توجد مزامنة سحابية وهمية." />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="هوية النظام">
          <Info label="النظام" value="مركز تشغيل الصيانة" />
          <Info label="المطور" value="ElawadyEssam" />
          <Info label="البريد" value="ElawadyEssam8@gmail.com" />
          <Info label="التواصل" value="01112429073" />
          <Info label="التخزين" value="على هذا المتصفح فقط" />
        </Panel>
        <Panel title="نسخة احتياطية">
          <p className="mb-3 text-sm text-muted">صدّر ملفًا يمكنك فتحه لاحقًا على نفس الجهاز أو جهاز آخر. الاستيراد واستعادة التجربة للمسؤول.</p>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => downloadText("maintenance-backup.json", data.exportBackup(), "application/json")}>تصدير النسخة</SecondaryButton>
            {user.role === "admin" ? (
              <label className="inline-flex h-11 cursor-pointer items-center rounded-lg border border-line bg-soft px-4 text-sm font-bold">
                استيراد
                <input type="file" accept="application/json" className="hidden" onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (!file) return;
                  void file.text().then((json) => {
                    try {
                      const message = data.importBackup(JSON.parse(json));
                      if (message) toast.error(message);
                      else toast.success("تم استيراد النسخة");
                    } catch {
                      toast.error("تعذر قراءة الملف");
                    }
                  });
                }} />
              </label>
            ) : null}
            {user.role === "admin" ? <SecondaryButton danger onClick={() => {
              if (!window.confirm("ستُستبدل البيانات الحالية بالبيانات التجريبية. هل تريد المتابعة؟")) return;
              const message = data.resetDemo();
              if (message) toast.error(message);
              else toast.success("تمت استعادة البيانات التجريبية");
            }}>استعادة التجربة</SecondaryButton> : null}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="mb-2 rounded-lg bg-soft p-3"><small className="text-xs text-muted">{label}</small><b className="block text-sm">{value}</b></div>;
}
