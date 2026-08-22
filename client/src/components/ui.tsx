import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        "h-6 w-6 animate-spin rounded-full border-2 border-crust-600/30 border-t-crust-700",
        className
      )}
    />
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-2xl border border-crust-800/10 bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const styles = {
    primary: "bg-crust-700 text-white hover:bg-crust-800 disabled:bg-crust-700/40",
    secondary: "bg-cream-200 text-crust-800 hover:bg-cream-200/70",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
    ghost: "bg-transparent text-crust-700 hover:bg-cream-100",
  };
  return (
    <button
      className={clsx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        "w-full rounded-lg border border-crust-800/15 bg-white px-3 py-2 text-sm text-crust-800 placeholder:text-crust-800/40 focus:border-amber-550 focus:outline-none focus:ring-2 focus:ring-amber-550/20",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={clsx(
        "w-full rounded-lg border border-crust-800/15 bg-white px-3 py-2 text-sm text-crust-800 focus:border-amber-550 focus:outline-none focus:ring-2 focus:ring-amber-550/20",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "w-full rounded-lg border border-crust-800/15 bg-white px-3 py-2 text-sm text-crust-800 placeholder:text-crust-800/40 focus:border-amber-550 focus:outline-none focus:ring-2 focus:ring-amber-550/20",
        className
      )}
      {...props}
    />
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-crust-800/60">{children}</label>;
}

const badgeColors: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  READY: "bg-purple-100 text-purple-800",
  COMPLETED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
  PAID: "bg-green-100 text-green-800",
  PARTIAL: "bg-amber-100 text-amber-800",
  UNPAID: "bg-red-100 text-red-800",
  default: "bg-cream-200 text-crust-800",
};

export function Badge({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        badgeColors[value] ?? badgeColors.default
      )}
    >
      {label ?? value.replace("_", " ")}
    </span>
  );
}

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-16 text-center">
      <div className="text-3xl">🍞</div>
      <p className="font-medium text-crust-800">{title}</p>
      {subtitle && <p className="text-sm text-crust-800/60">{subtitle}</p>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  accent = "amber",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "amber" | "green" | "red" | "blue";
}) {
  const accents: Record<string, string> = {
    amber: "from-amber-500/15 to-amber-500/0 text-amber-700",
    green: "from-green-500/15 to-green-500/0 text-green-700",
    red: "from-red-500/15 to-red-500/0 text-red-700",
    blue: "from-blue-500/15 to-blue-500/0 text-blue-700",
  };
  return (
    <Card className={clsx("bg-gradient-to-br p-4", accents[accent])}>
      <p className="text-xs font-medium uppercase tracking-wide text-crust-800/60">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-crust-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-crust-800/50">{sub}</p>}
    </Card>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-crust-800/40 p-4" onClick={onClose}>
      <div
        className={clsx("max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-xl", width)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-crust-800">{title}</h3>
          <button onClick={onClose} className="text-crust-800/40 hover:text-crust-800">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function money(n: number | undefined | null) {
  return `$${(n ?? 0).toFixed(2)}`;
}
