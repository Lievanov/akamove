"use client";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./utils/cn";

// Side panel that slides in from the right — same Radix Dialog base as
// Dialog.jsx (focus trap, Escape, scroll lock), laid out as a full-height
// sheet for longer reference content.
const Drawer = RadixDialog.Root;
const DrawerTrigger = RadixDialog.Trigger;

function DrawerContent({ title, description, className, children, ...props }) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-brand-dark/40" />
      <RadixDialog.Content
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-xl focus:outline-none",
          className
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-dark/10 px-6 py-4">
          <div>
            <RadixDialog.Title className="text-lg font-semibold text-brand-dark">
              {title}
            </RadixDialog.Title>
            {description && (
              <RadixDialog.Description className="mt-0.5 text-sm text-brand-dark/60">
                {description}
              </RadixDialog.Description>
            )}
          </div>
          <RadixDialog.Close asChild>
            <button
              aria-label="Close"
              className="rounded-full p-1 text-brand-dark/60 hover:bg-brand-dark/10 hover:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink"
            >
              <X className="h-4 w-4" />
            </button>
          </RadixDialog.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export { Drawer, DrawerTrigger, DrawerContent };
