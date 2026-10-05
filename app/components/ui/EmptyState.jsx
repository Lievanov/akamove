import { cn } from "./utils/cn";

// Placeholder for a list or section with nothing in it yet: says what
// belongs here and offers the action that adds the first one.
// Props: `icon` (a lucide-react component), `title`, `description`,
// `action` (e.g. a <Button>), `className`.
function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-lg border border-dashed border-brand-dark/20 px-6 py-10 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-cream text-brand-pink-deep">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <p className="text-sm font-semibold text-brand-dark">{title}</p>
      {description && (
        <p className="mt-1 max-w-md text-sm text-brand-dark/60">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export { EmptyState };
