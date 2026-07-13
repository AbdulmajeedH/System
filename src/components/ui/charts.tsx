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
          <div className="h-3 overflow-hidden rounded-full bg-neutral-100">
            <div
              className="h-full rounded-full bg-foreground"
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
    <div className="flex h-44 items-end gap-1.5 rounded-3xl bg-neutral-50 p-3">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full rounded-t-xl bg-foreground/80 transition-colors hover:bg-foreground"
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
    <div className="rounded-[1.75rem] border border-border bg-card p-5 shadow-sm shadow-black/[0.03] transition hover:-translate-y-0.5 hover:shadow-md">
      <p className="mb-3 text-xs font-bold text-muted">{label}</p>
      <p className={`dir-ltr text-start text-2xl font-black tracking-tight ${toneClass}`}>
        {value}
        {suffix ? <span className="text-xs font-normal"> {suffix}</span> : null}
      </p>
    </div>
  );
}
