import { RefreshCw } from "lucide-react";

export function QueryProgress({ active, label = "Updating…" }) {
  if (!active) return null;
  return (
    <span className="query-progress" role="status">
      <RefreshCw size={13} aria-hidden="true" />
      {label}
    </span>
  );
}
