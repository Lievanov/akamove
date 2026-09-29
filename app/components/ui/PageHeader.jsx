function PageHeader({ title }) {
  return (
    <header className="relative border-b border-brand-dark/10 bg-white">
      <div className="px-6 py-4">
        <h1 className="truncate text-lg font-semibold text-brand-dark">
          {title}
        </h1>
      </div>
    </header>
  );
}

export { PageHeader };
