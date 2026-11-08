export function LibraryBanner({
  title,
  description,
  icon: Icon,
  action,
  stats,
  unavailable,
}) {
  return (
    <header className="library-banner">
      <div className="library-banner-main">
        <div className="library-banner-icon">
          <Icon size={28} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action}
      </div>
      <dl className="library-banner-stats">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{unavailable ? "—" : value}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
