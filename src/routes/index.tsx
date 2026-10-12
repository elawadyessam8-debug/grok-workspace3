import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MaintenanceApp } from "@/components/cmms/app";
import { useCmms } from "@/lib/cmms/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void Promise.resolve(useCmms.persist.rehydrate()).finally(() => setReady(true));
  }, []);
  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-navy text-on-navy">
        <div className="text-center">
          <p className="text-lg font-extrabold">مركز تشغيل الصيانة</p>
          <p className="mt-2 text-sm text-navy-muted">جاري تحميل البيانات</p>
        </div>
      </main>
    );
  }
  return <MaintenanceApp />;
}
