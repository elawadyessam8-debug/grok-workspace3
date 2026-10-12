import type { Permissions, Role, Section, User } from "@/lib/cmms/types";

export const ROLE_LABEL: Record<Role, string> = {
  admin: "مسؤول",
  supervisor: "مشرف صيانة",
  technician: "فني صيانة",
};

export const PRIORITY_LABEL = {
  normal: "عادي",
  important: "مهم",
  urgent: "طارئ",
} as const;

export const STATUS_LABEL = {
  open: "مفتوح",
  closed: "مغلق",
} as const;

export const FREQUENCY_LABEL = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
  quarterly: "ربع سنوي",
  semiannual: "نصف سنوي",
  yearly: "سنوي",
} as const;

export const FREQUENCY_DAYS = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  quarterly: 90,
  semiannual: 180,
  yearly: 365,
} as const;

export function canSee(user: User, permissions: Permissions, section: Section) {
  if (section === "home" || section === "settings" || section === "notifications") return true;
  if (section === "users") return user.role === "admin";
  if (user.role === "admin") return true;
  const set = user.role === "supervisor" ? permissions.supervisor : permissions.technician;
  if (section === "workorders" || section === "breakdowns") return !!set?.breakdowns;
  if (section === "equipment") return !!set?.equipment;
  if (section === "pm") return !!set?.pm;
  if (section === "parts") return !!set?.parts;
  if (section === "reports") return !!set?.reports;
  return false;
}

export function canManageAssets(user: User) {
  return user.role === "admin" || user.role === "supervisor";
}

export function canLogBreakdown(user: User) {
  return user.role === "admin" || user.role === "technician";
}

export function canManagePlans(user: User) {
  return user.role === "admin" || user.role === "supervisor";
}

export function canManageParts(user: User) {
  return user.role === "admin" || user.role === "supervisor";
}
