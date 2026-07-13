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
          <div className="h-3 overflow-hidden rounded-full bg-canvas-soft">
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
    <div className="flex h-48 items-end gap-1.5 rounded-[1.35rem] bg-gradient-to-b from-canvas-softer to-canvas-soft p-4">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div
            className="w-full rounded-t-xl bg-primary/85 shadow-[0_8px_18px_rgba(0,0,0,0.12)] transition-colors hover:bg-primary"
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
    <div className="group rounded-[1.5rem] border border-border bg-card p-6 shadow-[0_14px_32px_rgba(0,0,0,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(0,0,0,0.09)]">
      <p className="mb-3 text-sm font-bold leading-5 text-muted">{label}</p>
      <p className={`dir-ltr text-start text-3xl font-black leading-9 tracking-tight ${toneClass}`}>
        {value}
        {suffix ? <span className="text-xs font-normal"> {suffix}</span> : null}
      </p>
    </div>
  );
}
