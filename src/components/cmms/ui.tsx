import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { Priority, WorkStatus } from "@/lib/cmms/types";
import { PRIORITY_LABEL, STATUS_LABEL } from "@/lib/cmms/access";

export function PageHead({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-4">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{text}</p>
      </div>
      {children}
    </div>
  );
}

export function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-4 rounded-xl border border-line bg-panel p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-3 border-b border-line pb-3">
        <h3 className="text-sm font-extrabold text-ink">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-sm text-muted">{children}</div>;
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field mb-3 block">
      <span className="mb-1.5 block text-xs font-extrabold text-ink">{label}</span>
      {children}
    </label>
  );
}

export function PrimaryButton({ children, type = "button", onClick, disabled, className = "" }: { children: ReactNode; type?: "button" | "submit"; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-extrabold text-on-accent disabled:opacity-60 ${className}`}>
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick, disabled, danger }: { children: ReactNode; onClick?: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-lg border px-4 text-sm font-bold disabled:opacity-60 ${danger ? "border-danger bg-danger text-on-accent" : "border-line bg-soft text-ink"}`}
    >
      {children}
    </button>
  );
}

export function StatusPill({ status }: { status: WorkStatus }) {
  const open = status === "open";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${open ? "bg-danger/10 text-danger" : "bg-good/10 text-good"}`}>{STATUS_LABEL[status]}</span>;
}

export function PriorityPill({ priority }: { priority: Priority }) {
  const tone = priority === "urgent" ? "bg-danger/10 text-danger" : priority === "important" ? "bg-warn/15 text-warn" : "bg-soft text-muted";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-extrabold ${tone}`}>{PRIORITY_LABEL[priority]}</span>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 p-3 sm:items-center" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`max-h-[90vh] w-full overflow-auto rounded-2xl bg-panel p-5 shadow-xl ${wide ? "max-w-3xl" : "max-w-lg"}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
          <h3 className="text-base font-extrabold text-ink">{title}</h3>
          <button type="button" className="grid size-11 place-items-center rounded-lg border border-line bg-soft" onClick={onClose} aria-label="إغلاق">
            <X className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
