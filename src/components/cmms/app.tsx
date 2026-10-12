import { useEffect, useState } from "react";
import { Bell, CalendarClock, ChartColumn, ClipboardList, Cog, LayoutDashboard, LogOut, Menu, Package, Settings, Users, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Toaster } from "sonner";
import { canSee, ROLE_LABEL } from "@/lib/cmms/access";
import { useCmms } from "@/lib/cmms/store";
import type { Section, User } from "@/lib/cmms/types";
import { BreakdownsPage, WorkOrdersPage } from "@/components/cmms/breakdowns";
import { EquipmentPage } from "@/components/cmms/equipment";
import { HomePage } from "@/components/cmms/home";
import { LoginScreen } from "@/components/cmms/login";
import { NotificationsPage, SettingsPage, UsersPage } from "@/components/cmms/manage";
import { PartsPage } from "@/components/cmms/parts";
import { PmPage } from "@/components/cmms/pm";
import { ReportsPage } from "@/components/cmms/reports";

const MAIN: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "لوحة التشغيل", icon: LayoutDashboard },
  { id: "equipment", label: "الأصول والمعدات", icon: Cog },
  { id: "breakdowns", label: "بلاغات الأعطال", icon: Wrench },
  { id: "workorders", label: "أوامر الصيانة", icon: ClipboardList },
  { id: "pm", label: "الصيانة الوقائية", icon: CalendarClock },
  { id: "parts", label: "المخزون وقطع الغيار", icon: Package },
  { id: "reports", label: "مؤشرات الأداء", icon: ChartColumn },
  { id: "notifications", label: "مركز التنبيهات", icon: Bell },
];

const FOOT: { id: Section; label: string; icon: LucideIcon }[] = [
  { id: "users", label: "المستخدمون والصلاحيات", icon: Users },
  { id: "settings", label: "إعدادات النظام", icon: Settings },
];

export function MaintenanceApp() {
  const user = useCmms((state) => state.users.find((item) => item.id === state.sessionUserId) ?? null);
  return (
    <>
      <Toaster dir="rtl" position="top-center" />
      {user ? <Shell user={user} /> : <LoginScreen />}
    </>
  );
}

function Shell({ user }: { user: User }) {
  const section = useCmms((state) => state.section);
  const setSection = useCmms((state) => state.setSection);
  const permissions = useCmms((state) => state.permissions);
  const unread = useCmms((state) => state.notifications.filter((item) => !item.read).length);
  const logout = useCmms((state) => state.logout);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!canSee(user, permissions, section)) setSection("home");
  }, [user, permissions, section, setSection]);

  function go(id: Section) {
    setSection(id);
    setOpen(false);
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="topbar no-print">
        <button type="button" className="menu-btn" aria-expanded={open} aria-label="فتح قائمة الأقسام" onClick={() => setOpen(true)}>
          <Menu className="size-4" />
          الأقسام
        </button>
        <h1 className="me-auto truncate text-base font-extrabold">مركز تشغيل الصيانة</h1>
        <span className="hidden max-w-48 truncate text-xs text-navy-muted sm:block">{user.name} — {ROLE_LABEL[user.role]}</span>
        <button type="button" className="icon-btn relative" aria-label="التنبيهات" onClick={() => go("notifications")}>
          <Bell className="size-4" />
          {unread > 0 ? <span className="absolute -top-1 -start-1 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-xs text-on-accent">{unread}</span> : null}
        </button>
        <button type="button" className="icon-btn" aria-label="خروج" onClick={logout}><LogOut className="size-4" /></button>
      </header>
      {open ? <button type="button" className="scrim" aria-label="إغلاق القائمة" onClick={() => setOpen(false)} /> : null}
      <div className="app-body">
        <aside className={`sidebar no-print ${open ? "is-open" : ""}`}>
          <div className="side-brand"><b>مركز التشغيل</b><small>Maintenance Control Center</small></div>
          <nav aria-label="أقسام النظام">
            {MAIN.filter((item) => canSee(user, permissions, item.id)).map((item) => (
              <NavButton key={item.id} item={item} active={section === item.id} badge={item.id === "notifications" ? unread : 0} onClick={() => go(item.id)} />
            ))}
          </nav>
          <div className="side-foot">
            {FOOT.filter((item) => canSee(user, permissions, item.id)).map((item) => (
              <NavButton key={item.id} item={item} active={section === item.id} badge={0} onClick={() => go(item.id)} />
            ))}
          </div>
        </aside>
        <main className="main-pane">
          <div className="page">
            {section === "home" ? <HomePage user={user} /> : null}
            {section === "equipment" ? <EquipmentPage user={user} /> : null}
            {section === "breakdowns" ? <BreakdownsPage user={user} /> : null}
            {section === "workorders" ? <WorkOrdersPage /> : null}
            {section === "pm" ? <PmPage user={user} /> : null}
            {section === "parts" ? <PartsPage user={user} /> : null}
            {section === "reports" ? <ReportsPage user={user} /> : null}
            {section === "notifications" ? <NotificationsPage /> : null}
            {section === "users" ? <UsersPage user={user} /> : null}
            {section === "settings" ? <SettingsPage user={user} /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function NavButton({ item, active, badge, onClick }: { item: { id: string; label: string; icon: LucideIcon }; active: boolean; badge: number; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button type="button" className={`side-link ${active ? "is-active" : ""}`} aria-current={active ? "page" : undefined} onClick={onClick}>
      <span className="side-ico"><Icon className="size-4" /></span>
      <span className="truncate">{item.label}</span>
      {badge > 0 ? <span className="ms-auto rounded-full bg-danger px-2 text-xs text-on-accent">{badge}</span> : null}
    </button>
  );
}
