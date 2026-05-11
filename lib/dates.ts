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

function isValidDateParts(day: number, month: number, year: number) {
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function parseHrDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const text = String(value).trim();
  if (!text) return null;

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate.map(Number);
    if (!isValidDateParts(day, month, year)) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  const hrDate = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})\.?$/);
  if (hrDate) {
    const [, day, month, year] = hrDate.map(Number);
    if (!isValidDateParts(day, month, year)) return null;
    return new Date(Date.UTC(year, month - 1, day));
  }

  const isoDateTime = text.match(/^\d{4}-\d{2}-\d{2}T/);
  if (isoDateTime) {
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

export function formatHrDate(date: Date | null) {
  if (!date) return "-";

  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();

  return `${day}.${month}.${year}.`;
}

export function formatHrDateValue(value: Date | string | null | undefined) {
  if (!value) return "-";

  const date = value instanceof Date ? value : parseHrDate(value);
  return formatHrDate(date);
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
