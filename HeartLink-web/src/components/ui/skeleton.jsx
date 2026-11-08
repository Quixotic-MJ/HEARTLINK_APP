
export function Skeleton({ className, ...props }) {
  return (
    <div
      className={`relative overflow-hidden bg-ds-surface-alt rounded-xl ${className}`}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
    </div>
  );
}
