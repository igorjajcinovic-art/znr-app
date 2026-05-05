export type DeadlineStatus = "ok" | "warning" | "expired" | "muted";

export function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

export function daysUntil(date: Date | null) {
  if (!date) return null;

  const today = startOfToday();
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function deadlineStatus(date: Date | null): DeadlineStatus {
  const diff = daysUntil(date);

  if (diff === null) return "muted";
  if (diff < 0) return "expired";
  if (diff <= 30) return "warning";
  return "ok";
}

export function isWarningDate(date: Date | null) {
  const status = deadlineStatus(date);
  return status === "expired" || status === "warning";
}

export function formatHrDate(date: Date | null) {
  if (!date) return "-";

  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export function deadlineText(date: Date | null) {
  const diff = daysUntil(date);

  if (diff === null) return "Nema roka";
  if (diff < 0) return `Isteklo prije ${Math.abs(diff)} dana`;
  if (diff === 0) return "Istjece danas";
  if (diff === 1) return "Istjece sutra";
  return `Istjece za ${diff} dana`;
}

export function shortDeadlineLabel(diff: number) {
  if (diff < 0) return "Isteklo";
  if (diff === 0) return "Danas";
  return `${diff} dana`;
}
