"use client";
import { useEffect, useState } from "react";
import { Alert } from "./Alert";
import { cn } from "./utils/cn";

function Toast({ text, severity, duration = 5000, onExited }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setOpen(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => onExited?.(), 500);
    return () => clearTimeout(timer);
  }, [open, onExited]);

  return (
    <Alert
      severity={severity}
      className={cn(
        "transition-opacity duration-500",
        open ? "opacity-100" : "opacity-0"
      )}
    >
      {text}
    </Alert>
  );
}

export { Toast };
