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

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-hover",
  secondary:
    "bg-card border border-border text-foreground shadow-sm hover:bg-background hover:border-muted/40",
  danger: "bg-danger text-white shadow-sm hover:opacity-90",
  ghost: "text-foreground hover:bg-black/5",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold",
        "transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none min-h-11",
        buttonVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

const controlClass =
  "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm min-h-11 " +
  "shadow-sm transition-colors duration-150 placeholder:text-muted/60 " +
  "hover:border-muted/50 focus:outline-none focus:ring-2 focus:ring-ring/35 focus:border-primary " +
  "disabled:opacity-60 disabled:bg-background";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx(controlClass, className)} {...props} />;
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        controlClass,
        "appearance-none bg-no-repeat [background-position:left_0.75rem_center] [background-size:1rem]",
        "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')]",
        "ps-3.5 pe-9", // chevron sits at the visual left (inline-end in RTL)
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx(controlClass, "min-h-24", className)} {...props} />;
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
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layout primitives
// ---------------------------------------------------------------------------

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cx(
        "rounded-xl bg-card border border-border p-4 sm:p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-5">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
      {action}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="py-12 text-center text-muted text-sm">{message}</div>;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

type BadgeTone = "gray" | "green" | "red" | "amber" | "blue" | "teal";

const badgeTones: Record<BadgeTone, string> = {
  gray: "bg-slate-100 text-slate-700 ring-slate-200",
  green: "bg-green-50 text-green-700 ring-green-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  teal: "bg-teal-50 text-teal-700 ring-teal-200",
};

export function Badge({ tone = "gray", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  );
}

const statusTones: Record<string, BadgeTone> = {
  DRAFT: "gray",
  SUBMITTED: "blue",
  REVIEWED: "amber",
  APPROVED: "green",
  REJECTED: "red",
  PENDING: "amber",
  RECEIVED: "green",
  PARTIALLY_APPROVED: "amber",
  PREPARING: "blue",
  READY: "teal",
  DELIVERED: "blue",
  PARTIALLY_RECEIVED: "amber",
  COMPLETED: "green",
  DISPUTED: "red",
  CANCELLED: "gray",
  POSTED: "green",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={statusTones[status] ?? "gray"}>{label}</Badge>;
}
