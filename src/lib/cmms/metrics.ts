import type { Breakdown, Equipment, Part, PmLog, PmPlan } from "@/lib/cmms/types";
import { dateOnly, daysUntil, minutesBetween, parseLocal } from "@/lib/cmms/time";

export interface Summary {
  rows: Breakdown[];
  closed: Breakdown[];
  down: number;
  mttr: number;
  mtbf: number;
  failures: number;
  open: number;
}

export function equipmentName(list: Equipment[], id: string) {
  return list.find((item) => item.id === id)?.name ?? "معدة محذوفة";
}

export function isCritical(part: Part) {
  return part.qty <= part.minQty;
}

export function summarize(breakdowns: Breakdown[], from: string, to: string): Summary {
  const rows = breakdowns.filter((item) => {
    const day = dateOnly(item.start);
    return day >= from && day <= to;
  });
  const closed = rows.filter((item) => item.status === "closed" && item.start && item.end);
  const down = closed.reduce((sum, item) => sum + minutesBetween(item.start, item.end), 0);
  const mttr = closed.length ? Math.round(down / closed.length) : 0;
  const hours = Math.max(0, (parseLocal(`${to}T23:59`) - parseLocal(`${from}T00:00`)) / 3600000);
  const failures = rows.length;
  const uptime = Math.max(0, hours - down / 60);
  const mtbf = failures ? Math.round((uptime / failures) * 10) / 10 : 0;
  const open = rows.filter((item) => item.status === "open").length;
  return { rows, closed, down, mttr, mtbf, failures, open };
}

export function lifetimeMetrics(breakdowns: Breakdown[]) {
  const closed = breakdowns.filter((item) => item.status === "closed" && item.start && item.end);
  const down = closed.reduce((sum, item) => sum + minutesBetween(item.start, item.end), 0);
  const mttr = closed.length ? Math.round(down / closed.length) : 0;
  const starts = breakdowns
    .map((item) => parseLocal(item.start))
    .filter((value) => !Number.isNaN(value))
    .sort((a, b) => a - b);
  let mtbf = 0;
  if (starts.length > 1) {
    let gaps = 0;
    for (let index = 1; index < starts.length; index += 1) gaps += (starts[index] - starts[index - 1]) / 3600000;
    mtbf = Math.round((gaps / (starts.length - 1)) * 10) / 10;
  }
  return { down, mttr, mtbf };
}

export function pmDueCount(plans: PmPlan[]) {
  return plans.filter((plan) => plan.active && daysUntil(plan.nextDate) <= 0).length;
}

export function complianceRate(plans: PmPlan[], history: PmLog[]) {
  const overdue = plans.filter((plan) => plan.active && daysUntil(plan.nextDate) < 0).length;
  const onTime = history.filter((item) => item.onTime).length;
  const dueTotal = history.length + overdue;
  return dueTotal ? Math.round((onTime / dueTotal) * 100) : 100;
}
