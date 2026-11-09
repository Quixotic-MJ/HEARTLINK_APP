import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import ConfirmActionModal from "../modals/confirmActionModal.jsx";

// HL-026 / HL-037: a PT (exercises) or Dietitian (recipes) approves several waiting items at once.
// The confirm step lists every name, so each one is still a deliberate approval; the server records
// the approver and time for each, the same as approving one. Restyled for the new portal (HL-136).

/** A row or card checkbox. */
export function SelectBox({ checked, onChange, label }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      onClick={(event) => event.stopPropagation()}
      aria-label={label}
      className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-cal-hairline accent-cal-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cal-primary"
    />
  );
}

/** The bar at the bottom while items are ticked, and the confirm step behind its button. */
export function BulkApproveBar({ selected, noun, approve, onClear, onDone }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const count = selected.length;
  if (!count) return null;
  const nouns = count === 1 ? noun : `${noun}s`;

  const run = async () => {
    const results = await Promise.allSettled(selected.map((item) => approve(item)));
    const failed = results.filter((result) => result.status === "rejected").length;
    const ok = count - failed;
    if (ok) {
      toast.success(`${ok} ${ok === 1 ? noun : `${noun}s`} approved`, {
        description: "Patients can see them now.",
      });
    }
    if (failed) {
      toast.error(`${failed} couldn't be approved`, {
        description: "They're still ticked. Refresh the page, then try again.",
      });
    }
    onDone(selected.filter((_, index) => results[index].status === "rejected"));
    setConfirmOpen(false);
  };

  return (
    <>
      {/* Room at the end of the page, so the bar never covers the last rows. */}
      <div className="h-24" aria-hidden="true" />
      <div
        role="region"
        aria-label="Ticked items"
        className="fixed bottom-6 left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2 rounded-[14px] border border-cal-hairline bg-cal-canvas py-2 pl-4 pr-2 font-cal-sans text-cal-ink shadow-[0_10px_30px_rgba(20,40,60,0.16)]"
      >
        <span className="mr-1 flex items-center gap-2 text-[13.5px] font-medium">
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-ds-sky px-1.5 text-[12px] font-semibold tabular-nums text-ds-on-tint">
            {count}
          </span>
          <span>{nouns} ticked</span>
        </span>
        <button
          type="button"
          onClick={() => {
          setConfirmOpen(false);
          onClear();
        }}
          className="h-9 cursor-pointer rounded-[10px] px-3 text-[13px] font-medium text-cal-muted transition-colors hover:bg-cal-surface-soft hover:text-cal-ink"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] bg-cal-primary px-4 text-[13px] font-semibold text-cal-on-primary transition-colors hover:bg-cal-primary-active"
        >
          <ShieldCheck size={15} aria-hidden="true" />
          <span>Approve for patients</span>
        </button>
      </div>

      <ConfirmActionModal
        className="workspace"
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={run}
        title={`Approve ${count} ${nouns}?`}
        description="Have you checked each of these? Patients see them as soon as they're approved, and each one records you as the approver."
        confirmText={`Yes, approve ${count}`}
        cancelText="Go back"
        variant="primary"
        icon={ShieldCheck}
      >
        <ul className="mt-4 max-h-48 divide-y divide-cal-hairline overflow-y-auto rounded-[10px] border border-cal-hairline bg-cal-surface-soft text-left">
          {selected.map((item) => (
            <li key={item.id} className="px-3.5 py-2.5 text-[13.5px] font-medium text-cal-ink">
              {item.name}
            </li>
          ))}
        </ul>
      </ConfirmActionModal>
    </>
  );
}
