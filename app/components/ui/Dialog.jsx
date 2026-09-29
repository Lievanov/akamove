"use client";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./utils/cn";

const Dialog = RadixDialog.Root;
const DialogTrigger = RadixDialog.Trigger;

function DialogContent({ className, children, ...props }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-brand-dark/50" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-6 shadow-xl focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
        <RadixDialog.Close asChild>
          <button
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1 text-brand-dark/60 hover:bg-brand-dark/10 hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
          >
            <X className="h-4 w-4" />
          </button>
        </RadixDialog.Close>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

function DialogTitle({ className, ...props }) {
  return (
    <RadixDialog.Title
      className={cn("mb-4 text-lg font-semibold text-brand-dark", className)}
      {...props}
    />
  );
}

function DialogActions({ className, ...props }) {
  return (
    <div
      className={cn("mt-6 flex justify-end gap-2", className)}
      {...props}
    />
  );
}

export { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogActions };
