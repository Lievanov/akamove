"use client";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "./utils/cn";

const Tabs = RadixTabs.Root;

function TabsList({ className, ...props }) {
  return (
    <RadixTabs.List
      className={cn(
        "flex flex-wrap gap-1 border-b border-brand-dark/10 px-1",
        className
      )}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <RadixTabs.Trigger
      className={cn(
        "flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-brand-dark/60 hover:text-brand-dark data-[state=active]:border-brand-pink data-[state=active]:text-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-pink",
        className
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return <RadixTabs.Content className={cn("p-3", className)} {...props} />;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
