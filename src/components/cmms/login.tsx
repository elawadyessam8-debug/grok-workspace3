import { useState } from "react";
import { toast } from "sonner";
import { Wrench } from "lucide-react";
import { DEMO_PASSWORD, useCmms } from "@/lib/cmms/store";
import { Field, PrimaryButton } from "@/components/cmms/ui";

const DEMOS = [
  { username: "admin", label: "مسؤول", hint: "كل الصلاحيات" },
  { username: "super", label: "مشرف صيانة", hint: "أصول وخطط وتقارير" },
  { username: "tech", label: "فني صيانة", hint: "تسجيل الأعطال والتنفيذ" },
];

export function LoginScreen() {
  const login = useCmms((state) => state.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(nextUser = username, nextPass = password) {
    setPending(true);
    const message = await login(nextUser, nextPass);
    setPending(false);
    if (message) {
      setError(message);
      toast.error(message);
      return;
    }
    setError("");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-navy px-4 py-10">
      <form
        className="w-full max-w-md rounded-2xl bg-panel p-7 shadow-xl"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-xl bg-navy text-on-navy">
            <Wrench className="size-5" />
          </span>
          <h1 className="text-2xl font-extrabold text-ink">مركز تشغيل الصيانة</h1>
          <p className="mt-1 text-sm text-muted">متابعة الأصول والأعطال والصيانة الوقائية</p>
        </div>
        <Field label="اسم المستخدم">
          <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </Field>
        <Field label="كلمة المرور">
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
        </Field>
        {error ? <p className="mb-3 text-center text-sm font-bold text-danger">{error}</p> : null}
        <PrimaryButton type="submit" disabled={pending} className="w-full">
          {pending ? "جاري الدخول" : "تسجيل الدخول"}
        </PrimaryButton>
        <div className="mt-5 border-t border-line pt-4">
          <p className="mb-2 text-xs font-bold text-muted">حسابات تجريبية — كلمة المرور {DEMO_PASSWORD}</p>
          <div className="grid gap-2">
            {DEMOS.map((demo) => (
              <button
                key={demo.username}
                type="button"
                className="flex min-h-11 items-center justify-between rounded-lg border border-line bg-soft px-3 text-start"
                onClick={() => {
                  setUsername(demo.username);
                  setPassword(DEMO_PASSWORD);
                  void submit(demo.username, DEMO_PASSWORD);
                }}
              >
                <span className="font-extrabold text-ink">{demo.label}</span>
                <span className="text-xs text-muted">{demo.hint}</span>
              </button>
            ))}
          </div>
        </div>
      </form>
    </main>
  );
}
