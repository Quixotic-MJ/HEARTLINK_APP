import { LayoutGrid, List } from "lucide-react";

export function LibraryViewSwitch({ value, onChange }) {
  return (
    <div role="group" aria-label="Library view" className="library-view-switch">
      {[
        ["grid", "Grid view", LayoutGrid],
        ["list", "List view", List],
      ].map(([key, label, Icon]) => (
        <button
          key={key}
          type="button"
          aria-label={label}
          title={label}
          aria-pressed={value === key}
          onClick={() => onChange(key)}
        >
          <Icon size={17} aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
