import { cn } from "./utils/cn";

function Table({ className, ...props }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-left text-sm", className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }) {
  return (
    <thead
      className={cn(
        "border-b border-brand-dark/10 text-xs font-semibold uppercase tracking-wide text-brand-dark/60",
        className
      )}
      {...props}
    />
  );
}

function TableBody({ className, ...props }) {
  return (
    <tbody
      className={cn("divide-y divide-brand-dark/5", className)}
      {...props}
    />
  );
}

function TableRow({ className, ...props }) {
  return (
    <tr className={cn("hover:bg-brand-pink/5", className)} {...props} />
  );
}

function TableHead({ className, ...props }) {
  return <th className={cn("px-3 py-3 sm:px-4", className)} {...props} />;
}

function TableCell({ className, ...props }) {
  return (
    <td
      className={cn("px-3 py-3 tabular-nums text-brand-dark sm:px-4", className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
