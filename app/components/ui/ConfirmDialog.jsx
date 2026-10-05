"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogActions,
} from "./Dialog";
import { Button } from "./Button";
import { cn } from "./utils/cn";

// "Are you sure?" for actions that can't be undone. `onConfirm` may be
// async; the confirm button shows progress and the dialog closes when it
// resolves.
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
}) {
  const [working, setWorking] = useState(false);

  const handleConfirm = async () => {
    setWorking(true);
    try {
      await onConfirm?.();
      onOpenChange(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !working && onOpenChange(next)}>
      <DialogContent className="max-w-md">
        <DialogTitle>{title}</DialogTitle>
        {description && <DialogDescription>{description}</DialogDescription>}
        <DialogActions>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={working}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={working}
            className={cn(danger && "bg-danger hover:bg-danger/90")}
          >
            {working ? "Working…" : confirmLabel}
          </Button>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
}

export { ConfirmDialog };
