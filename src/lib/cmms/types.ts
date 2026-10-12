export const SECTIONS = [
  "home",
  "equipment",
  "breakdowns",
  "workorders",
  "pm",
  "parts",
  "reports",
  "notifications",
  "users",
  "settings",
] as const;

export type Section = (typeof SECTIONS)[number];
export type Role = "admin" | "supervisor" | "technician";
export type Priority = "normal" | "important" | "urgent";
export type WorkStatus = "open" | "closed";
export type Frequency = "daily" | "weekly" | "monthly" | "quarterly" | "semiannual" | "yearly";

export interface PermSet {
  equipment: boolean;
  breakdowns: boolean;
  pm: boolean;
  parts: boolean;
  reports: boolean;
}

export interface Permissions {
  technician: PermSet;
  supervisor: PermSet;
}

export interface User {
  id: string;
  name: string;
  username: string;
  passwordHash: string;
  role: Role;
  active: boolean;
}

export interface Equipment {
  id: string;
  name: string;
  code: string;
  model: string;
  image: string;
  pdfName: string;
  pdfData: string;
  createdAt: string;
}

export interface Part {
  id: string;
  name: string;
  storeNo: string;
  qty: number;
  minQty: number;
  equipmentIds: string[];
  machineQty: Record<string, number>;
}

export interface UsedPart {
  partId: string;
  name: string;
  storeNo: string;
  qty: number;
}

export interface Breakdown {
  id: string;
  equipmentId: string;
  description: string;
  cause: string;
  action: string;
  technician: string;
  priority: Priority;
  status: WorkStatus;
  start: string;
  end: string;
  usedParts: UsedPart[];
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  number: string;
  breakdownId: string;
  equipmentId: string;
  technician: string;
  priority: Priority;
  status: WorkStatus;
  createdAt: string;
}

export interface PmPlan {
  id: string;
  equipmentId: string;
  title: string;
  frequency: Frequency;
  intervalDays: number;
  nextDate: string;
  lastDate: string;
  assignedTo: string;
  tasks: string[];
  active: boolean;
}

export interface PmLog {
  id: string;
  planId: string;
  equipmentId: string;
  title: string;
  date: string;
  technician: string;
  result: string;
  onTime: boolean;
  note: string;
}

export interface Notice {
  id: string;
  title: string;
  body: string;
  breakdownId: string;
  read: boolean;
  createdAt: string;
}

export interface FocusTarget {
  kind: "breakdown";
  id: string;
}

export interface DataSlice {
  users: User[];
  permissions: Permissions;
  equipment: Equipment[];
  breakdowns: Breakdown[];
  parts: Part[];
  pmPlans: PmPlan[];
  pmHistory: PmLog[];
  workOrders: WorkOrder[];
  notifications: Notice[];
  sessionUserId: string | null;
  section: Section;
  reportFrom: string;
  reportTo: string;
  focus: FocusTarget | null;
}
