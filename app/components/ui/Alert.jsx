"use client";
import { AlertTriangle, CheckCircle2, Info, XCircle, X } from "lucide-react";
import { cn } from "./utils/cn";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: "bg-green-50 text-green-800 border-green-200",
  error: "bg-red-50 text-red-800 border-red-200",
  warning: "bg-amber-50 text-amber-800 border-amber-200",
  info: "bg-brand-pink/10 text-brand-dark border-brand-pink/20",
};

function Alert({ severity = "info", children, onClose, className }) {
  const Icon = ICONS[severity];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border px-4 py-3 text-sm",
        STYLES[severity],
        className
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          type="button"
          aria-label="Dismiss"
          onClick={onClose}
          className="shrink-0 rounded p-0.5 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export { Alert };
