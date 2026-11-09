export function WorkspaceHeader({ title, description, icon: Icon, children }) {
  return (
    <header className="workspace-header">
      <div className="workspace-header-symbol">
        <Icon size={22} strokeWidth={1.7} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {children && <div className="workspace-header-actions">{children}</div>}
    </header>
  );
}
