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

type ButtonVariant = "primary" | "secondary" | "subtle" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-[0_10px_24px_rgba(0,0,0,0.16)] hover:bg-primary-hover active:bg-primary-hover",
  secondary: "bg-card text-foreground shadow-sm ring-1 ring-inset ring-border hover:bg-canvas-softer active:bg-surface-pressed",
  subtle: "bg-canvas-soft text-foreground hover:bg-surface-pressed active:bg-surface-pressed",
  danger: "bg-danger text-white hover:bg-red-700 active:bg-red-800",
  ghost: "text-foreground hover:bg-canvas-soft active:bg-surface-pressed",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-bold leading-5",
        "transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

const controlClass =
  "w-full rounded-2xl border-0 bg-canvas-soft px-4 py-4 text-base leading-6 text-foreground min-h-14 " +
  "placeholder:text-muted transition-colors focus:outline-none focus:ring-4 focus:ring-primary/15 focus:bg-canvas-softer " +
  "disabled:opacity-60 disabled:bg-surface-pressed";

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
      <label className="block text-sm font-medium leading-4 text-foreground">
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
    <div className={cx("rounded-[1.5rem] border border-border bg-card p-6 shadow-[0_16px_40px_rgba(0,0,0,0.06)]", className)}>
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
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? <p className="text-xs font-normal leading-5 text-muted">{eyebrow}</p> : null}
        <h1 className="text-4xl font-bold leading-[44px] text-foreground sm:text-[52px] sm:leading-[64px]">{title}</h1>
        {subtitle ? <p className="max-w-3xl text-base leading-6 text-muted sm:text-lg">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function EmptyState({ message, title = t.ui.emptyTitle }: { message: string; title?: string }) {
  return (
    <div className="rounded-[1.5rem] bg-canvas-soft px-8 py-12 text-center shadow-inner">
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-white text-xl" aria-hidden>•</div>
      <h2 className="font-bold text-foreground">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{message}</p>
    </div>
  );
}

export function LoadingSkeleton({ className }: { className?: string }) {
  return <div className={cx("animate-pulse rounded-2xl bg-canvas-soft", className ?? "h-24")} />;
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
    <span className={cx("inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium leading-5 ring-1 whitespace-nowrap", badgeTones[tone])}>
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
    <Card className="flex items-start justify-between gap-4 bg-canvas-soft">
      <div className="min-w-0">
        <h3 className="truncate text-base font-medium">{title}</h3>
        {meta ? <div className="mt-2 text-sm text-muted">{meta}</div> : null}
      </div>
      {value ? <div className="shrink-0 text-end text-lg font-bold">{value}</div> : null}
      {action ? <div className="shrink-0">{action}</div> : null}
    </Card>
  );
}
