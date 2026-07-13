import { formatMoney } from "@/lib/utils/format";
import { t } from "@/lib/i18n/ar";

/**
 * Dependency-free CSS charts — RTL-safe by construction (logical
 * properties + document flow), which chart libraries often get wrong.
 */

export function HBarChart({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>{d.label}</span>
            <span className="dir-ltr font-semibold">
              {formatMoney(d.value)} {t.app.currency}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-background overflow-hidden">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${(d.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ColumnChart({
  data,
}: {
  data: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-36">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full rounded-t bg-primary/80 hover:bg-primary transition-colors"
            style={{ height: `${(d.value / max) * 100}%` }}
            title={`${d.label}: ${formatMoney(d.value)} ${t.app.currency}`}
          />
          <span className="text-[9px] text-muted truncate w-full text-center dir-ltr">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export function StatTile({
  label,
  value,
  suffix,
  tone,
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: "danger" | "warning" | "success";
}) {
  const toneClass =
    tone === "danger"
      ? "text-danger"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "";
  return (
    <div className="rounded-xl bg-card border border-border p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-shadow duration-150 hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)]">
      <p className="text-xs text-muted mb-1.5">{label}</p>
      <p className={`text-lg font-bold dir-ltr text-start tabular-nums ${toneClass}`}>
        {value}
        {suffix ? <span className="text-xs font-normal text-muted"> {suffix}</span> : null}
      </p>
    </div>
  );
}
