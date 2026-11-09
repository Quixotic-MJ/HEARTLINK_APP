
export function Skeleton({ className = "", ...props }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`}
      {...props}
    />
  );
}
