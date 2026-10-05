"use client";
import { Children } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "./utils/cn";

const Dialog = RadixDialog.Root;
const DialogTrigger = RadixDialog.Trigger;

function DialogContent({ className, children, ...props }) {
  const hasDescription = Children.toArray(children).some(
    (child) => child?.type === DialogDescription
  );
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-brand-dark/50" />
      {/* Radix warns when a dialog has no Description; most of ours don't
          need one, so opt out unless a DialogDescription is a direct child. */}
      <RadixDialog.Content
        {...(!hasDescription && { "aria-describedby": undefined })}
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg bg-white p-5 shadow-xl focus:outline-none sm:p-6",
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

function DialogDescription({ className, ...props }) {
  return (
    <RadixDialog.Description
      className={cn("-mt-2 mb-4 text-sm text-brand-dark/70", className)}
      {...props}
    />
  );
}

function DialogActions({ className, ...props }) {
  return (
    <div
      className={cn("mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogActions,
};
