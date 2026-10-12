export function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateInput(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function today() {
  return toDateInput(new Date());
}

export function monthStart() {
  const date = new Date();
  return toDateInput(new Date(date.getFullYear(), date.getMonth(), 1));
}

export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(year || 1970, (month || 1) - 1, day || 1);
  date.setDate(date.getDate() + days);
  return toDateInput(date);
}

export function nowLocal() {
  const date = new Date();
  return `${toDateInput(date)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function atDaysAgo(days: number, time: string) {
  return `${addDays(today(), -days)}T${time}`;
}

export function parseLocal(value: string) {
  const [date, time = "00:00"] = value.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1, hour || 0, minute || 0, 0, 0).getTime();
}

export function dateOnly(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

export function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) return 0;
  const diff = parseLocal(end) - parseLocal(start);
  return diff > 0 ? Math.round(diff / 60000) : 0;
}

export function daysUntil(date?: string | null) {
  if (!date) return 99999;
  const target = parseLocal(date.slice(0, 10));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now.getTime()) / 86400000);
}

export function formatMinutes(mins: number) {
  const total = Math.max(0, Math.round(mins));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours <= 0) return `${rest} د`;
  return `${hours} س ${rest} د`;
}

export function formatWhen(value?: string | null, empty = "غير مسجل") {
  if (!value) return empty;
  const time = parseLocal(value);
  if (Number.isNaN(time)) return value;
  return new Date(time).toLocaleString("ar-EG-u-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function greeting(name: string) {
  const hour = new Date().getHours();
  const hello = hour < 12 ? "صباح الخير" : "مساء الخير";
  return `${hello}، ${name}`;
}
