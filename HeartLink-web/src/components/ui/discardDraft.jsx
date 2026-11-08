import { useEffect, useRef } from "react";

export function DiscardDraft({ onKeep, onDiscard }) {
  const keepRef = useRef(null);
  useEffect(() => {
    keepRef.current?.focus();
  }, []);
  return (
    <section className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-8">
      <h3
        id="discard-changes-title"
        className="font-cal-display text-xl font-semibold"
      >
        Discard unsaved changes?
      </h3>
      <p className="text-sm leading-relaxed text-cal-muted">
        Discarding loses the changes held in this form. It does not undo
        completed saves or change saved records and history.
      </p>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          ref={keepRef}
          type="button"
          onClick={onKeep}
          className="min-h-11 rounded-lg border border-cal-hairline px-4 py-2 text-sm font-semibold hover:bg-cal-surface-soft"
        >
          Keep editing
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="min-h-11 rounded-lg bg-cal-error px-4 py-2 text-sm font-semibold text-cal-on-primary"
        >
          Discard draft
        </button>
      </div>
    </section>
  );
}
