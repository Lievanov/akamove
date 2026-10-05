"use client";
import { useEffect, useState } from "react";
import { Alert } from "./Alert";
import { cn } from "./utils/cn";

// Floating confirmation/error message, bottom-right, so it never pushes
// the page content around as it appears and fades.
function Toast({ text, severity, duration = 5000, onExited }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    // Errors stay until dismissed; they usually need reading.
    if (severity === "error") return;
    const timer = setTimeout(() => setOpen(false), duration);
    return () => clearTimeout(timer);
  }, [duration, severity]);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => onExited?.(), 300);
    return () => clearTimeout(timer);
  }, [open, onExited]);

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex justify-end sm:inset-x-auto sm:right-6">
      <Alert
        severity={severity}
        onClose={() => setOpen(false)}
        className={cn(
          "pointer-events-auto w-full max-w-sm shadow-lg transition-all duration-300 motion-reduce:transition-none",
          open ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
        )}
      >
        {text}
      </Alert>
    </div>
  );
}

export { Toast };
