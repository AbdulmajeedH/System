/**
 * Formatting helpers. Western digits are used for amounts (common in Saudi
 * business apps) while labels stay Arabic.
 */

const moneyFormatter = new Intl.NumberFormat("ar-SA-u-nu-latn", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const qtyFormatter = new Intl.NumberFormat("ar-SA-u-nu-latn", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatMoney(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return moneyFormatter.format(Number.isFinite(n) ? n : 0);
}

export function formatQty(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  return qtyFormatter.format(Number.isFinite(n) ? n : 0);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/** yyyy-mm-dd for <input type="date"> values, in local time. */
export function toDateInputValue(date: Date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
