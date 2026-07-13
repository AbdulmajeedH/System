import { t } from "@/lib/i18n/ar";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.14)] hover:bg-primary-hover active:translate-y-px",
  secondary: "bg-card border border-border text-foreground hover:border-foreground hover:bg-neutral-50 active:translate-y-px",
  danger: "bg-danger text-white hover:bg-red-700 active:translate-y-px",
  ghost: "text-foreground hover:bg-black/5 active:bg-black/10",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-bold",
        "transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

const controlClass =
  "w-full rounded-2xl border border-border bg-card px-4 py-3 text-base min-h-12 shadow-sm shadow-black/[0.02] " +
  "placeholder:text-neutral-400 transition focus:outline-none focus:ring-4 focus:ring-primary/15 focus:border-foreground " +
  "disabled:opacity-60 disabled:bg-neutral-100";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(controlClass, "appearance-none", className)} {...props}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(controlClass, "min-h-28 resize-y", className)} {...props} />;
}

export function FormField({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-bold text-foreground">
        {label}
        {required ? <span className="text-danger" aria-label={t.ui.required}> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs leading-5 text-muted">{hint}</p> : null}
      {error ? <p className="text-sm font-medium text-danger" role="alert">{error}</p> : null}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("rounded-[1.75rem] border border-border bg-card p-4 shadow-sm shadow-black/[0.03] sm:p-6", className)}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{eyebrow}</p> : null}
        <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">{title}</h1>
        {subtitle ? <p className="max-w-3xl text-sm leading-6 text-muted sm:text-base">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ message, title = t.ui.emptyTitle }: { message: string; title?: string }) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-border bg-neutral-50 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-white text-xl shadow-sm" aria-hidden>•</div>
      <h2 className="font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{message}</p>
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-2xl bg-neutral-200", className ?? "h-24")} />;
}

type BadgeTone = "gray" | "green" | "red" | "amber" | "blue" | "teal";

const badgeTones: Record<BadgeTone, string> = {
  gray: "bg-neutral-100 text-neutral-800 ring-neutral-200",
  green: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  red: "bg-red-50 text-red-800 ring-red-200",
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  blue: "bg-blue-50 text-blue-800 ring-blue-200",
  teal: "bg-teal-50 text-teal-800 ring-teal-200",
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ring-1 whitespace-nowrap", badgeTones[tone])}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {children}
    </span>
  );
}

const statusTones: Record<string, BadgeTone> = {
  DRAFT: "gray", SUBMITTED: "blue", REVIEWED: "amber", APPROVED: "green", REJECTED: "red",
  PENDING: "amber", RECEIVED: "green", PARTIALLY_APPROVED: "amber", PREPARING: "blue", READY: "teal",
  DELIVERED: "blue", PARTIALLY_RECEIVED: "amber", COMPLETED: "green", DISPUTED: "red", CANCELLED: "gray",
  POSTED: "green", ACTIVE: "green", INACTIVE: "gray", LOW_STOCK: "amber", EXPIRED: "red",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={statusTones[status] ?? "gray"}>{label}</Badge>;
}

export function DataCard({ title, meta, value, action }: { title: string; meta?: ReactNode; value?: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="truncate text-base font-bold">{title}</h3>
        {meta ? <div className="mt-2 text-sm text-muted">{meta}</div> : null}
      </div>
      {value ? <div className="shrink-0 text-end font-black">{value}</div> : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </Card>
  );
}
