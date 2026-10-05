"use client";
import Link from "next/link";
import * as RadixMenu from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { iconButtonClass } from "./IconButton";
import { cn } from "./utils/cn";

// "⋯" menu holding a table row's secondary actions, so each row shows one
// primary action at most. Items: { label, href } for navigation or
// { label, onSelect, disabled, danger } for in-place actions.
function RowMenu({ label = "More actions", items }) {
  const visible = items.filter(Boolean);
  if (visible.length === 0) return null;

  const itemClass = (item) =>
    cn(
      "flex w-full cursor-pointer select-none items-center rounded px-3 py-2 text-sm touch:py-3 outline-none data-[disabled]:pointer-events-none data-[highlighted]:bg-brand-pink/10 data-[disabled]:opacity-40",
      item.danger ? "text-danger" : "text-brand-dark"
    );

  return (
    <RadixMenu.Root modal={false}>
      <RadixMenu.Trigger aria-label={label} className={iconButtonClass}>
        <MoreHorizontal className="h-4 w-4" />
      </RadixMenu.Trigger>
      <RadixMenu.Portal>
        <RadixMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[11rem] rounded-md border border-brand-dark/10 bg-white p-1 shadow-lg"
        >
          {visible.map((item) =>
            item.href ? (
              <RadixMenu.Item key={item.label} asChild className={itemClass(item)}>
                <Link href={item.href}>{item.label}</Link>
              </RadixMenu.Item>
            ) : (
              <RadixMenu.Item
                key={item.label}
                disabled={item.disabled}
                onSelect={item.onSelect}
                className={itemClass(item)}
              >
                {item.label}
              </RadixMenu.Item>
            )
          )}
        </RadixMenu.Content>
      </RadixMenu.Portal>
    </RadixMenu.Root>
  );
}

export { RowMenu };
