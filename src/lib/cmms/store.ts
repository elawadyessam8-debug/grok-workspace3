import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { canLogBreakdown, canManageAssets, canManageParts, canManagePlans, canSee } from "@/lib/cmms/access";
import type {
  Breakdown,
  DataSlice,
  Equipment,
  FocusTarget,
  Frequency,
  Notice,
  Part,
  PermSet,
  Permissions,
  PmPlan,
  Priority,
  Role,
  Section,
  UsedPart,
  User,
  WorkOrder,
} from "@/lib/cmms/types";
import { SECTIONS } from "@/lib/cmms/types";
import { addDays, atDaysAgo, daysUntil, monthStart, nowLocal, parseLocal, today } from "@/lib/cmms/time";

export const DEMO_PASSWORD = "1234";
const DEMO_HASH = "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4";

async function sha256(text: string) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function nextOrderNumber(orders: WorkOrder[]) {
  const max = orders.reduce((highest, order) => {
    const value = Number(order.number.replace(/\D/g, ""));
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 1000);
  return `WO-${String(max + 1).padStart(4, "0")}`;
}

export function createSeed(): DataSlice {
  const permissions: Permissions = {
    technician: { equipment: true, breakdowns: true, pm: true, parts: true, reports: false },
    supervisor: { equipment: true, breakdowns: true, pm: true, parts: true, reports: true },
  };
  const users: User[] = [
    { id: "user-admin", name: "المسؤول", username: "admin", passwordHash: DEMO_HASH, role: "admin", active: true },
    { id: "user-super", name: "مشرف الصيانة", username: "super", passwordHash: DEMO_HASH, role: "supervisor", active: true },
    { id: "user-tech", name: "فني الصيانة", username: "tech", passwordHash: DEMO_HASH, role: "technician", active: true },
  ];
  const equipment: Equipment[] = [
    { id: "eq-pack", name: "ماكينة التعبئة 01", code: "PK-101", model: "خط التعبئة أ", image: "", pdfName: "", pdfData: "", createdAt: atDaysAgo(40, "08:00") },
    { id: "eq-air", name: "ضاغط الهواء الرئيسي", code: "CA-014", model: "غرفة المرافق", image: "", pdfName: "", pdfData: "", createdAt: atDaysAgo(40, "08:10") },
    { id: "eq-belt", name: "السير الناقل", code: "CV-220", model: "خط الإنتاج ب", image: "", pdfName: "", pdfData: "", createdAt: atDaysAgo(30, "08:00") },
    { id: "eq-mix", name: "خلاط المواد الخام", code: "MX-007", model: "قسم الخلط", image: "", pdfName: "", pdfData: "", createdAt: atDaysAgo(30, "08:20") },
  ];
  const parts: Part[] = [
    { id: "part-bearing", name: "Bearing 6205", storeNo: "SP-00025", qty: 2, minQty: 4, equipmentIds: ["eq-pack"], machineQty: { "eq-pack": 4 } },
    { id: "part-sensor", name: "حساس تقارب", storeNo: "SP-00110", qty: 6, minQty: 2, equipmentIds: ["eq-belt"], machineQty: { "eq-belt": 2 } },
    { id: "part-belt", name: "سير نقل", storeNo: "SP-00088", qty: 1, minQty: 2, equipmentIds: ["eq-belt", "eq-pack"], machineQty: { "eq-belt": 1, "eq-pack": 2 } },
    { id: "part-oil", name: "زيت تشحيم ISO 68", storeNo: "SP-00301", qty: 14, minQty: 4, equipmentIds: [], machineQty: {} },
  ];
  const breakdowns: Breakdown[] = [
    {
      id: "bd-open-1",
      equipmentId: "eq-pack",
      description: "توقف مفاجئ مع ارتفاع حرارة وحدة اللحام",
      cause: "تلف مبدئي في الحساس",
      action: "",
      technician: "فني الصيانة",
      priority: "urgent",
      status: "open",
      start: atDaysAgo(0, "07:40"),
      end: "",
      usedParts: [],
      createdAt: atDaysAgo(0, "07:41"),
    },
    {
      id: "bd-open-2",
      equipmentId: "eq-air",
      description: "هبوط ضغط الهواء عن 6 بار",
      cause: "تسريب في الوصلة",
      action: "",
      technician: "فني الصيانة",
      priority: "important",
      status: "open",
      start: atDaysAgo(1, "14:10"),
      end: "",
      usedParts: [],
      createdAt: atDaysAgo(1, "14:12"),
    },
    {
      id: "bd-closed-1",
      equipmentId: "eq-mix",
      description: "انسداد في فوهة التغذية",
      cause: "تراكم خام",
      action: "تنظيف الفوهة وإعادة الضبط",
      technician: "فني الصيانة",
      priority: "normal",
      status: "closed",
      start: atDaysAgo(4, "08:00"),
      end: atDaysAgo(4, "10:30"),
      usedParts: [],
      createdAt: atDaysAgo(4, "08:05"),
    },
    {
      id: "bd-closed-2",
      equipmentId: "eq-belt",
      description: "انحراف السير عن المسار",
      cause: "ارتخاء الشد",
      action: "إعادة الشد",
      technician: "فني الصيانة",
      priority: "important",
      status: "closed",
      start: atDaysAgo(12, "09:00"),
      end: atDaysAgo(12, "09:40"),
      usedParts: [{ partId: "part-belt", name: "سير نقل", storeNo: "SP-00088", qty: 1 }],
      createdAt: atDaysAgo(12, "09:02"),
    },
    {
      id: "bd-closed-3",
      equipmentId: "eq-pack",
      description: "عطل حساس العد",
      cause: "حساس تالف",
      action: "استبدال الحساس",
      technician: "فني الصيانة",
      priority: "urgent",
      status: "closed",
      start: atDaysAgo(20, "11:00"),
      end: atDaysAgo(20, "12:20"),
      usedParts: [],
      createdAt: atDaysAgo(20, "11:04"),
    },
  ];
  const workOrders: WorkOrder[] = breakdowns.map((item, index) => ({
    id: `wo-${item.id}`,
    number: `WO-${1001 + index}`,
    breakdownId: item.id,
    equipmentId: item.equipmentId,
    technician: item.technician,
    priority: item.priority,
    status: item.status,
    createdAt: item.createdAt,
  }));
  const pmPlans: PmPlan[] = [
    { id: "pm-1", equipmentId: "eq-pack", title: "تشحيم محامل التعبئة", frequency: "weekly", intervalDays: 7, nextDate: today(), lastDate: addDays(today(), -7), assignedTo: "فني الصيانة", tasks: ["إيقاف آمن", "تشحيم المحامل", "فحص الحرارة"], active: true },
    { id: "pm-2", equipmentId: "eq-air", title: "فحص ضاغط الهواء", frequency: "monthly", intervalDays: 30, nextDate: addDays(today(), -3), lastDate: addDays(today(), -33), assignedTo: "مشرف الصيانة", tasks: ["قياس الضغط", "فحص التسريب", "تنظيف الفلتر"], active: true },
    { id: "pm-3", equipmentId: "eq-mix", title: "مراجعة الخلاط الربع سنوية", frequency: "quarterly", intervalDays: 90, nextDate: addDays(today(), 6), lastDate: "", assignedTo: "فني الصيانة", tasks: ["فحص الشفرات", "ربط الوصلات"], active: true },
    { id: "pm-4", equipmentId: "eq-belt", title: "فحص شد السير", frequency: "semiannual", intervalDays: 180, nextDate: addDays(today(), 40), lastDate: "", assignedTo: "فني الصيانة", tasks: ["قياس الشد", "فحص البكرات"], active: true },
  ];
  const notifications: Notice[] = [
    { id: "nt-1", title: "عطل طارئ: ماكينة التعبئة 01", body: "توقف مفاجئ مع ارتفاع حرارة وحدة اللحام", breakdownId: "bd-open-1", read: false, createdAt: atDaysAgo(0, "07:41") },
    { id: "nt-2", title: "عطل مهم: ضاغط الهواء الرئيسي", body: "هبوط ضغط الهواء عن 6 بار", breakdownId: "bd-open-2", read: false, createdAt: atDaysAgo(1, "14:12") },
  ];
  return {
    users,
    permissions,
    equipment,
    breakdowns,
    parts,
    pmPlans,
    pmHistory: [
      { id: "log-1", planId: "pm-1", equipmentId: "eq-pack", title: "تشحيم محامل التعبئة", date: addDays(today(), -7), technician: "فني الصيانة", result: "مكتملة", onTime: true, note: "" },
    ],
    workOrders,
    notifications,
    sessionUserId: null,
    section: "home",
    reportFrom: monthStart(),
    reportTo: today(),
    focus: null,
  };
}

interface Actions {
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
  setSection: (section: Section) => void;
  setFocus: (focus: FocusTarget | null) => void;
  setReportRange: (from: string, to: string) => string | null;
  addEquipment: (input: { name: string; code: string; model: string; image: string; pdfName: string; pdfData: string }) => string | null;
  updateEquipment: (id: string, input: { name: string; code: string; model: string; image?: string; pdfName?: string; pdfData?: string }) => string | null;
  deleteEquipment: (id: string) => string | null;
  addBreakdown: (input: { equipmentId: string; description: string; cause: string; action: string; priority: Priority; start: string; end: string; used: UsedPart[] }) => string | null;
  closeBreakdown: (id: string) => string | null;
  addPart: (input: { name: string; storeNo: string; qty: number; minQty: number; equipmentIds: string[] }) => string | null;
  togglePartLink: (partId: string, equipmentId: string) => void;
  setMachineQty: (partId: string, equipmentId: string, qty: number) => void;
  savePlan: (input: { id?: string; equipmentId: string; title: string; frequency: Frequency; intervalDays: number; nextDate: string; assignedTo: string; tasks: string[] }) => string | null;
  executePlan: (id: string, note: string) => string | null;
  addUser: (input: { name: string; username: string; password: string; role: Role }) => Promise<string | null>;
  deleteUser: (id: string) => string | null;
  setPerm: (role: "technician" | "supervisor", key: keyof PermSet, value: boolean) => string | null;
  markRead: (id: string) => void;
  markAllRead: () => void;
  resetDemo: () => string | null;
  exportBackup: () => string;
  importBackup: (raw: unknown) => string | null;
}

export type CmmsState = DataSlice & Actions;

function currentUser(state: CmmsState) {
  return state.users.find((user) => user.id === state.sessionUserId) ?? null;
}

function isSection(value: unknown): value is Section {
  return typeof value === "string" && SECTIONS.includes(value as Section);
}

const memory = new Map<string, string>();
const safeLocalStorage = {
  getItem: (name: string) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return memory.get(name) ?? null;
    }
  },
  setItem: (name: string, value: string) => {
    memory.set(name, value);
    try {
      localStorage.setItem(name, value);
    } catch {
      /* Keep the in-memory copy if the browser quota is full. */
    }
  },
  removeItem: (name: string) => {
    memory.delete(name);
    try {
      localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

export const useCmms = create<CmmsState>()(
  persist(
    (set, get) => ({
      ...createSeed(),
      login: async (username, password) => {
        const hash = await sha256(password);
        const user = get().users.find(
          (item) => item.active && item.username.trim().toLowerCase() === username.trim().toLowerCase() && item.passwordHash === hash,
        );
        if (!user) return "بيانات الدخول غير صحيحة";
        set({ sessionUserId: user.id, section: "home" });
        return null;
      },
      logout: () => set({ sessionUserId: null, section: "home", focus: null }),
      setSection: (section) => set({ section }),
      setFocus: (focus) => set({ focus }),
      setReportRange: (from, to) => {
        if (!from || !to || from > to) return "حدد فترة صحيحة من تاريخ إلى تاريخ";
        set({ reportFrom: from, reportTo: to });
        return null;
      },
      addEquipment: (input) => {
        const user = currentUser(get());
        if (!user || !canSee(user, get().permissions, "equipment") || !canManageAssets(user)) return "ليس لديك صلاحية إضافة المعدات";
        const name = input.name.trim();
        if (!name) return "اسم المعدة مطلوب";
        const item: Equipment = {
          id: uid(),
          name,
          code: input.code.trim(),
          model: input.model.trim(),
          image: input.image,
          pdfName: input.pdfName,
          pdfData: input.pdfData,
          createdAt: new Date().toISOString(),
        };
        set({ equipment: [item, ...get().equipment] });
        return null;
      },
      updateEquipment: (id, input) => {
        const user = currentUser(get());
        if (!user || !canManageAssets(user)) return "ليس لديك صلاحية تعديل المعدات";
        const name = input.name.trim();
        if (!name) return "اسم المعدة مطلوب";
        set({
          equipment: get().equipment.map((item) =>
            item.id === id
              ? {
                  ...item,
                  name,
                  code: input.code.trim(),
                  model: input.model.trim(),
                  image: input.image ?? item.image,
                  pdfName: input.pdfName ?? item.pdfName,
                  pdfData: input.pdfData ?? item.pdfData,
                }
              : item,
          ),
        });
        return null;
      },
      deleteEquipment: (id) => {
        const user = currentUser(get());
        if (!user || user.role !== "admin") return "إزالة المعدات للمسؤول فقط";
        set({
          equipment: get().equipment.filter((item) => item.id !== id),
          parts: get().parts.map((part) => ({
            ...part,
            equipmentIds: part.equipmentIds.filter((equipmentId) => equipmentId !== id),
            machineQty: Object.fromEntries(Object.entries(part.machineQty).filter(([key]) => key !== id)),
          })),
        });
        return null;
      },
      addBreakdown: (input) => {
        const user = currentUser(get());
        if (!user || !canSee(user, get().permissions, "breakdowns") || !canLogBreakdown(user)) return "ليس لديك صلاحية تسجيل الأعطال";
        const description = input.description.trim();
        if (!input.equipmentId || !description) return "اختر المعدة واكتب وصف العطل";
        const start = input.start || nowLocal();
        const end = input.end;
        if (end && parseEndBeforeStart(start, end)) return "وقت الإغلاق لا يمكن أن يكون قبل وقت البداية";
        const parts = get().parts;
        for (const used of input.used) {
          const part = parts.find((item) => item.id === used.partId);
          if (!part) return "إحدى قطع الغيار لم تعد موجودة";
          if (used.qty < 1) return "كمية قطعة الغيار غير صحيحة";
          if (used.qty > part.qty) return `الكمية المطلوبة من «${part.name}» أكبر من المتاح (${part.qty})`;
        }
        const id = uid();
        const status = end ? "closed" : "open";
        const equipment = get().equipment.find((item) => item.id === input.equipmentId);
        const breakdown: Breakdown = {
          id,
          equipmentId: input.equipmentId,
          description,
          cause: input.cause.trim(),
          action: input.action.trim(),
          technician: user.name,
          priority: input.priority,
          status,
          start,
          end,
          usedParts: input.used,
          createdAt: new Date().toISOString(),
        };
        const order: WorkOrder = {
          id: uid(),
          number: nextOrderNumber(get().workOrders),
          breakdownId: id,
          equipmentId: input.equipmentId,
          technician: user.name,
          priority: input.priority,
          status,
          createdAt: breakdown.createdAt,
        };
        const notice: Notice = {
          id: uid(),
          title: `عطل ${breakdown.priority === "urgent" ? "طارئ" : breakdown.priority === "important" ? "مهم" : "عادي"}: ${equipment?.name ?? "معدة"}`,
          body: description,
          breakdownId: id,
          read: false,
          createdAt: breakdown.createdAt,
        };
        set({
          breakdowns: [breakdown, ...get().breakdowns],
          workOrders: [order, ...get().workOrders],
          notifications: [notice, ...get().notifications],
          parts: parts.map((part) => {
            const used = input.used.find((item) => item.partId === part.id);
            return used ? { ...part, qty: Math.max(0, part.qty - used.qty) } : part;
          }),
        });
        return null;
      },
      closeBreakdown: (id) => {
        const user = currentUser(get());
        if (!user || !canSee(user, get().permissions, "breakdowns")) return "ليس لديك صلاحية إغلاق الأعطال";
        const current = get().breakdowns.find((item) => item.id === id);
        if (!current) return "العطل غير موجود";
        if (current.status === "closed") return "العطل مغلق بالفعل";
        const end = nowLocal();
        set({
          breakdowns: get().breakdowns.map((item) => (item.id === id ? { ...item, status: "closed", end } : item)),
          workOrders: get().workOrders.map((item) => (item.breakdownId === id ? { ...item, status: "closed" } : item)),
        });
        return null;
      },
      addPart: (input) => {
        const user = currentUser(get());
        if (!user || !canSee(user, get().permissions, "parts") || !canManageParts(user)) return "ليس لديك صلاحية إضافة قطع الغيار";
        const name = input.name.trim();
        const storeNo = input.storeNo.trim();
        if (!name || !storeNo) return "اسم القطعة ورقم المخزن مطلوبان";
        if (get().parts.some((part) => part.storeNo.toLowerCase() === storeNo.toLowerCase())) return "رقم المخزن مستخدم بالفعل";
        const machineQty: Record<string, number> = {};
        input.equipmentIds.forEach((id) => {
          machineQty[id] = 0;
        });
        const part: Part = {
          id: uid(),
          name,
          storeNo,
          qty: Math.max(0, Math.floor(input.qty)),
          minQty: Math.max(0, Math.floor(input.minQty)),
          equipmentIds: input.equipmentIds,
          machineQty,
        };
        set({ parts: [part, ...get().parts] });
        return null;
      },
      togglePartLink: (partId, equipmentId) => {
        const user = currentUser(get());
        if (!user || !canManageParts(user)) return;
        set({
          parts: get().parts.map((part) => {
            if (part.id !== partId) return part;
            const linked = part.equipmentIds.includes(equipmentId);
            const equipmentIds = linked ? part.equipmentIds.filter((id) => id !== equipmentId) : [...part.equipmentIds, equipmentId];
            const machineQty = { ...part.machineQty };
            if (!linked && machineQty[equipmentId] === undefined) machineQty[equipmentId] = 0;
            if (linked) delete machineQty[equipmentId];
            return { ...part, equipmentIds, machineQty };
          }),
        });
      },
      setMachineQty: (partId, equipmentId, qty) => {
        const user = currentUser(get());
        if (!user || !canManageParts(user)) return;
        set({
          parts: get().parts.map((part) =>
            part.id === partId ? { ...part, machineQty: { ...part.machineQty, [equipmentId]: Math.max(0, Math.floor(qty)) } } : part,
          ),
        });
      },
      savePlan: (input) => {
        const user = currentUser(get());
        if (!user || !canSee(user, get().permissions, "pm") || !canManagePlans(user)) return "ليس لديك صلاحية تعديل خطط الصيانة";
        const title = input.title.trim();
        if (!input.equipmentId || !title || !input.nextDate) return "أكمل المعدة واسم الخطة وموعد الاستحقاق";
        const tasks = input.tasks.map((task) => task.trim()).filter(Boolean);
        const next: PmPlan = {
          id: input.id || uid(),
          equipmentId: input.equipmentId,
          title,
          frequency: input.frequency,
          intervalDays: Math.max(1, Math.floor(input.intervalDays) || 1),
          nextDate: input.nextDate,
          lastDate: input.id ? (get().pmPlans.find((plan) => plan.id === input.id)?.lastDate ?? "") : "",
          assignedTo: input.assignedTo.trim(),
          tasks: tasks.length ? tasks : ["تنفيذ بنود الخطة"],
          active: true,
        };
        const exists = get().pmPlans.some((plan) => plan.id === next.id);
        set({ pmPlans: exists ? get().pmPlans.map((plan) => (plan.id === next.id ? next : plan)) : [next, ...get().pmPlans] });
        return null;
      },
      executePlan: (id, note) => {
        const user = currentUser(get());
        if (!user || !canSee(user, get().permissions, "pm")) return "ليس لديك صلاحية تنفيذ الصيانة";
        const plan = get().pmPlans.find((item) => item.id === id);
        if (!plan) return "الخطة غير موجودة";
        const onTime = daysUntil(plan.nextDate) >= 0;
        let nextDate = plan.nextDate || today();
        const step = Math.max(1, plan.intervalDays || 1);
        let guard = 0;
        do {
          nextDate = addDays(nextDate, step);
          guard += 1;
        } while (daysUntil(nextDate) <= 0 && guard < 400);
        set({
          pmPlans: get().pmPlans.map((item) => (item.id === id ? { ...item, lastDate: today(), nextDate } : item)),
          pmHistory: [
            {
              id: uid(),
              planId: plan.id,
              equipmentId: plan.equipmentId,
              title: plan.title,
              date: today(),
              technician: user.name,
              result: "مكتملة",
              onTime,
              note: note.trim(),
            },
            ...get().pmHistory,
          ],
        });
        return null;
      },
      addUser: async (input) => {
        const user = currentUser(get());
        if (!user || user.role !== "admin") return "إضافة المستخدمين للمسؤول فقط";
        const name = input.name.trim();
        const username = input.username.trim();
        if (!name || !username || !input.password) return "أكمل بيانات المستخدم";
        if (input.password.length < 4) return "كلمة المرور قصيرة";
        if (get().users.some((item) => item.username.toLowerCase() === username.toLowerCase())) return "اسم المستخدم مستخدم بالفعل";
        const passwordHash = await sha256(input.password);
        set({
          users: [...get().users, { id: uid(), name, username, passwordHash, role: input.role, active: true }],
        });
        return null;
      },
      deleteUser: (id) => {
        const user = currentUser(get());
        if (!user || user.role !== "admin") return "حذف المستخدمين للمسؤول فقط";
        const target = get().users.find((item) => item.id === id);
        if (!target) return "المستخدم غير موجود";
        if (target.username === "admin" || target.id === user.id) return "لا يمكن حذف هذا الحساب";
        set({ users: get().users.filter((item) => item.id !== id) });
        return null;
      },
      setPerm: (role, key, value) => {
        const user = currentUser(get());
        if (!user || user.role !== "admin") return "تعديل الصلاحيات للمسؤول فقط";
        set({
          permissions: {
            ...get().permissions,
            [role]: { ...get().permissions[role], [key]: value },
          },
        });
        return null;
      },
      markRead: (id) => set({ notifications: get().notifications.map((item) => (item.id === id ? { ...item, read: true } : item)) }),
      markAllRead: () => set({ notifications: get().notifications.map((item) => ({ ...item, read: true })) }),
      resetDemo: () => {
        const user = currentUser(get());
        if (!user || user.role !== "admin") return "استعادة البيانات التجريبية للمسؤول فقط";
        const fresh = createSeed();
        set({ ...fresh, sessionUserId: "user-admin", section: "home", focus: null });
        return null;
      },
      exportBackup: () => {
        const state = get();
        return JSON.stringify(
          {
            users: state.users,
            permissions: state.permissions,
            equipment: state.equipment,
            breakdowns: state.breakdowns,
            parts: state.parts,
            pmPlans: state.pmPlans,
            pmHistory: state.pmHistory,
            workOrders: state.workOrders,
            notifications: state.notifications,
            reportFrom: state.reportFrom,
            reportTo: state.reportTo,
          },
          null,
          2,
        );
      },
      importBackup: (raw) => {
        const user = currentUser(get());
        if (!user || user.role !== "admin") return "استيراد النسخة للمسؤول فقط";
        if (!raw || typeof raw !== "object") return "الملف غير صالح";
        const data = raw as Partial<DataSlice>;
        if (!Array.isArray(data.users) || !Array.isArray(data.equipment) || !Array.isArray(data.breakdowns)) return "الملف لا يحتوي بيانات النظام";
        const users = data.users.filter(isUser);
        if (!users.some((item) => item.role === "admin")) return "النسخة يجب أن تحتوي حساب مسؤول";
        const sessionUserId = users.some((item) => item.id === get().sessionUserId) ? get().sessionUserId : users.find((item) => item.role === "admin")?.id ?? null;
        set({
          users,
          permissions: isPermissions(data.permissions) ? data.permissions : get().permissions,
          equipment: data.equipment.filter(isEquipment),
          breakdowns: Array.isArray(data.breakdowns) ? data.breakdowns.filter(isBreakdown) : [],
          parts: Array.isArray(data.parts) ? data.parts.filter(isPart).map(normalizePart) : [],
          pmPlans: Array.isArray(data.pmPlans) ? data.pmPlans.filter(isPlan) : [],
          pmHistory: Array.isArray(data.pmHistory) ? data.pmHistory : [],
          workOrders: Array.isArray(data.workOrders) ? data.workOrders : [],
          notifications: Array.isArray(data.notifications) ? data.notifications : [],
          reportFrom: typeof data.reportFrom === "string" ? data.reportFrom : get().reportFrom,
          reportTo: typeof data.reportTo === "string" ? data.reportTo : get().reportTo,
          sessionUserId,
          focus: null,
        });
        return null;
      },
    }),
    {
      name: "maintenance-command-v1",
      skipHydration: true,
      storage: createJSONStorage(() => safeLocalStorage),
      partialize: (state) => ({
        users: state.users,
        permissions: state.permissions,
        equipment: state.equipment,
        breakdowns: state.breakdowns,
        parts: state.parts,
        pmPlans: state.pmPlans,
        pmHistory: state.pmHistory,
        workOrders: state.workOrders,
        notifications: state.notifications,
        sessionUserId: state.sessionUserId,
        section: state.section,
        reportFrom: state.reportFrom,
        reportTo: state.reportTo,
      }),
      merge: (persisted, current) => {
        if (!persisted || typeof persisted !== "object") return current;
        const saved = persisted as Partial<DataSlice>;
        return {
          ...current,
          users: Array.isArray(saved.users) && saved.users.length ? saved.users : current.users,
          permissions: isPermissions(saved.permissions) ? saved.permissions : current.permissions,
          equipment: Array.isArray(saved.equipment) ? saved.equipment : current.equipment,
          breakdowns: Array.isArray(saved.breakdowns) ? saved.breakdowns : current.breakdowns,
          parts: Array.isArray(saved.parts) ? saved.parts : current.parts,
          pmPlans: Array.isArray(saved.pmPlans) ? saved.pmPlans : current.pmPlans,
          pmHistory: Array.isArray(saved.pmHistory) ? saved.pmHistory : current.pmHistory,
          workOrders: Array.isArray(saved.workOrders) ? saved.workOrders : current.workOrders,
          notifications: Array.isArray(saved.notifications) ? saved.notifications : current.notifications,
          sessionUserId: saved.sessionUserId ?? null,
          section: isSection(saved.section) ? saved.section : "home",
          reportFrom: saved.reportFrom || current.reportFrom,
          reportTo: saved.reportTo || current.reportTo,
          focus: null,
        };
      },
    },
  ),
);

function parseEndBeforeStart(start: string, end: string) {
  return parseLocal(end) < parseLocal(start);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

function isUser(value: unknown): value is User {
  if (!isRecord(value)) return false;
  return typeof value.id === "string" && typeof value.username === "string" && typeof value.passwordHash === "string" && (value.role === "admin" || value.role === "supervisor" || value.role === "technician");
}

function isPermSet(value: unknown): value is PermSet {
  if (!isRecord(value)) return false;
  return ["equipment", "breakdowns", "pm", "parts", "reports"].every((key) => typeof value[key] === "boolean");
}

function isPermissions(value: unknown): value is Permissions {
  return isRecord(value) && isPermSet(value.technician) && isPermSet(value.supervisor);
}

function isEquipment(value: unknown): value is Equipment {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function isBreakdown(value: unknown): value is Breakdown {
  return isRecord(value) && typeof value.id === "string" && typeof value.equipmentId === "string";
}

function isPart(value: unknown): value is Part {
  return isRecord(value) && typeof value.id === "string" && typeof value.name === "string";
}

function normalizePart(part: Part): Part {
  return {
    ...part,
    name: part.name || "",
    storeNo: part.storeNo || "",
    qty: Number(part.qty) || 0,
    minQty: Number(part.minQty) || 0,
    equipmentIds: Array.isArray(part.equipmentIds) ? part.equipmentIds.map(String) : [],
    machineQty: part.machineQty && typeof part.machineQty === "object" ? part.machineQty : {},
  };
}

function isPlan(value: unknown): value is PmPlan {
  return isRecord(value) && typeof value.id === "string" && typeof value.equipmentId === "string";
}
