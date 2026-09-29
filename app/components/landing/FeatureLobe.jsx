import { LobeDivider } from "./LobeDivider";

function FeatureLobe({ area, divider }) {
  const { id, label, bg, text, heading, description, features } = area;
  const gridCols =
    features.length > 2 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-2";

  return (
    <section
      id={id}
      aria-label={label}
      className={`relative overflow-hidden px-6 py-28 sm:px-10 lg:px-16 ${bg} ${text}`}
    >
      <div className="mx-auto max-w-5xl">
        <h2 className="max-w-2xl font-display text-4xl leading-tight tracking-[-0.02em] sm:text-5xl">
          {heading}
        </h2>
        <p className="mt-5 max-w-xl text-lg opacity-80">{description}</p>

        <div className={`mt-14 grid grid-cols-1 gap-x-10 gap-y-10 ${gridCols}`}>
          {features.map(({ icon: Icon, title, description: desc }) => (
            <div key={title} className="flex gap-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                  text === "text-white" || text === "text-brand-cream"
                    ? "bg-white/10"
                    : "bg-brand-dark/8"
                }`}
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed opacity-75">
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {divider && <LobeDivider {...divider} />}
    </section>
  );
}

export { FeatureLobe };
