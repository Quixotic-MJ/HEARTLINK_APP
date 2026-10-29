import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import ConfirmActionModal from "./ConfirmActionModal";

// HL-026 / HL-037: a PT (exercises) or Dietitian (recipes) approves several waiting items at once.
// The confirm step lists every name, so each one is still a deliberate approval; the server records
// the approver and time for each, the same as approving one.

/** A row or header checkbox; `indeterminate` shows the "some selected" dash in the header. */
export function SelectBox({ checked, indeterminate = false, onChange, label }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate && !checked;
  }, [indeterminate, checked]);

  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      className="h-4 w-4 rounded border-cal-hairline accent-cal-primary cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cal-ink"
    />
  );
}

/** The bar at the bottom while items are selected, and the confirm step behind its button. */
export function BulkApproveBar({ selected, noun, approve, onClear, onDone }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (!selected.length) return null;
  const n = selected.length;
  const nouns = n === 1 ? noun : `${noun}s`;

  const run = async () => {
    const results = await Promise.allSettled(selected.map((item) => approve(item)));
    const failed = results.filter((r) => r.status === "rejected").length;
    const ok = n - failed;
    if (ok) {
      toast.success(`${ok} ${ok === 1 ? noun : `${noun}s`} approved`, {
        description: "Patients can see them now.",
      });
    }
    if (failed) {
      toast.error(`${failed} couldn't be approved`, {
        description: "They're still selected. Try again.",
      });
    }
    onDone(
      results
        .map((r, i) => (r.status === "rejected" ? selected[i] : null))
        .filter(Boolean)
    );
  };

  return (
    <>
      {/* Room at the end of the page, so the bar never covers the last rows. */}
      <div className="h-24" aria-hidden="true" />
      <div
        role="region"
        aria-label="Selected items"
        className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border border-cal-surface-dark-elevated bg-cal-surface-dark py-2 pl-4 pr-2 font-cal-sans text-cal-on-dark shadow-[0_8px_28px_rgba(0,0,0,0.22)]"
      >
        <span className="mr-1 flex items-center gap-2 text-[13.5px] font-medium">
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-cal-surface-dark-elevated px-1.5 font-cal-mono text-[11.5px] font-semibold tabular-nums text-cal-on-dark">
            {n}
          </span>
          <span>{nouns} selected</span>
        </span>
        <button
          type="button"
          onClick={onClear}
          className="h-9 rounded-full px-3 text-[13px] font-medium text-cal-on-dark-soft hover:bg-cal-surface-dark-elevated hover:text-cal-on-dark transition-colors cursor-pointer"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-cal-canvas px-4 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
        >
          <ShieldCheck size={14.5} />
          <span>Approve for patients</span>
        </button>
      </div>

      <ConfirmActionModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={run}
        title={`Approve ${n} ${nouns}?`}
        description="Have you checked each of these? Patients see them as soon as they're approved, and each one records you as the approver."
        confirmText={`Yes, approve ${n}`}
        cancelText="Go back"
        variant="primary"
        icon={ShieldCheck}
      >
        <ul className="mt-4 max-h-48 divide-y divide-cal-hairline overflow-y-auto rounded-[10px] border border-cal-hairline bg-cal-surface-soft text-left">
          {selected.map((item) => (
            <li
              key={item.id}
              className="px-3.5 py-2.5 text-[13.5px] font-medium text-cal-ink"
            >
              {item.name}
            </li>
          ))}
        </ul>
      </ConfirmActionModal>
    </>
  );
}
