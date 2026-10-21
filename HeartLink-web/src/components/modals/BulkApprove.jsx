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
      className="w-4 h-4 accent-ds-line cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ds-line"
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
    if (ok) toast.success(`${ok} ${ok === 1 ? noun : `${noun}s`} approved`, { description: "Patients can see them now." });
    if (failed) toast.error(`${failed} couldn't be approved`, { description: "They're still selected. Try again." });
    onDone(results.map((r, i) => (r.status === "rejected" ? selected[i] : null)).filter(Boolean));
  };

  return (
    <>
      {/* Room at the end of the page, so the bar never covers the last rows. */}
      <div className="h-24" aria-hidden="true" />
      <div
        role="region"
        aria-label="Selected items"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 pl-4 pr-2 py-2 rounded-xl bg-ds-ink text-white shadow-2xl"
      >
        <span className="text-[14px] font-medium mr-1">
          {n} {nouns} selected
        </span>
        <button
          type="button"
          onClick={onClear}
          className="h-10 px-3 rounded-[8px] text-[14px] text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="h-10 px-4 rounded-[8px] bg-ds-primary hover:bg-ds-primary-pressed text-[14px] font-medium cursor-pointer"
        >
          Approve for patients
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
        <ul className="mt-4 max-h-48 overflow-y-auto rounded-[8px] border border-ds-hairline divide-y divide-ds-hairline-soft text-left">
          {selected.map((item) => (
            <li key={item.id} className="px-3 py-2 text-[14px] text-ds-ink">
              {item.name}
            </li>
          ))}
        </ul>
      </ConfirmActionModal>
    </>
  );
}
