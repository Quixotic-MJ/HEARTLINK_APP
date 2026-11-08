import { Dumbbell } from "lucide-react";

export function RoutinePreview({
  values,
  image,
  imageFailed,
  onImageError,
  durationLabel,
  editing,
}) {
  return (
    <aside className="content-live-preview" aria-label="Routine preview">
      <div className="content-preview-photo">
        {image && !imageFailed ? (
          <img src={image} alt="Routine demonstration" onError={onImageError} />
        ) : (
          <Dumbbell size={54} strokeWidth={1.3} aria-hidden="true" />
        )}
      </div>
      <p className="mt-5 text-xs font-medium text-cal-muted">
        {editing ? "Unsaved preview" : "Routine snapshot"}
      </p>
      <h4>{values.name || "Build a thoughtful routine"}</h4>
      <p className="mt-3 text-sm leading-relaxed text-cal-body">
        {values.description ||
          "Add clear instructions and the exact movement sequence for review."}
      </p>
      <dl className="mt-6 space-y-4 border-y border-[var(--workspace-line)] py-5 text-sm">
        {[
          ["Movement & rest", durationLabel],
          ["Type", values.type || "Not recorded"],
          ["Setting", values.setting || "Not recorded"],
          ["Position", values.position || "Not recorded"],
        ].map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4">
            <dt className="text-cal-muted">{label}</dt>
            <dd className="max-w-[60%] text-right font-medium">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs leading-relaxed text-cal-muted">
        A Physical Therapist reviews the movement, timing, equipment and safety
        instructions. This preview does not change the saved dose or grant
        approval.
      </p>
    </aside>
  );
}
