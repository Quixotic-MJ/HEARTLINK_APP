import { createPortal } from "react-dom";
import { useRef } from "react";
import { Info, Megaphone, ShieldAlert, Wrench, X } from "lucide-react";
import { useDialogFocus } from "../../../hooks/useDialogFocus.js";

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

export const CategoryBadge = ({ category }) => {
  switch (category) {
    case "Maintenance":
      return (
        <span
          className={`${PILL} border-cal-warning/35 bg-cal-warning/15 text-cal-ink`}
        >
          <Wrench size={11} className="text-cal-warning" aria-hidden="true" />
          <span>Maintenance</span>
        </span>
      );
    case "App Update":
      return (
        <span
          className={`${PILL} border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink`}
        >
          <Info
            size={11}
            className="text-cal-badge-violet"
            aria-hidden="true"
          />
          <span>App update</span>
        </span>
      );
    case "Safety Reminder":
      return (
        <span
          className={`${PILL} border-cal-error/25 bg-cal-error/10 text-cal-ink`}
        >
          <ShieldAlert
            size={11}
            className="text-cal-error"
            aria-hidden="true"
          />
          <span>Safety reminder</span>
        </span>
      );
    case "General":
      return (
        <span
          className={`${PILL} border-cal-success/25 bg-cal-success/10 text-cal-ink`}
        >
          <Megaphone
            size={11}
            className="text-cal-success"
            aria-hidden="true"
          />
          <span>General</span>
        </span>
      );
    default:
      return (
        <span
          className={`${PILL} border-cal-hairline bg-cal-surface-soft text-cal-muted`}
        >
          Category unavailable
        </span>
      );
  }
};

const ViewBroadcastModal = ({ isOpen, onClose, broadcast }) => {
  const dialogRef = useRef(null);
  useDialogFocus(isOpen, dialogRef, onClose);
  if (!isOpen || !broadcast) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-cal-sans">
      <div className="fixed inset-0 bg-cal-ink/40" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="view-broadcast-title"
        tabIndex={-1}
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-xl border border-cal-hairline bg-cal-canvas text-cal-ink shadow-xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-cal-hairline p-5">
          <div className="min-w-0">
            <CategoryBadge category={broadcast.type} />
            <h2
              id="view-broadcast-title"
              className="mt-2 break-words font-cal-display text-xl font-semibold"
            >
              {broadcast.title || "Announcement"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close announcement details"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cal-hairline"
          >
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-sm">
          <dl className="space-y-2 rounded-lg border border-cal-hairline p-3">
            <div>
              <dt className="text-cal-muted">Published (Asia/Manila)</dt>
              <dd>{broadcast.date || "Not recorded"}</dd>
            </div>
            <div>
              <dt className="text-cal-muted">Published by</dt>
              <dd className="break-words">
                {broadcast.display_publisher || "Not recorded"}
              </dd>
            </div>
            <div>
              <dt className="text-cal-muted">Recorded audience label</dt>
              <dd className="break-words">
                {broadcast.target_audience || "Not recorded"}
              </dd>
            </div>
          </dl>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {broadcast.message}
          </p>
          <p className="rounded-lg bg-cal-surface-soft p-3 text-cal-muted">
            This is a publication record, not proof of delivery, display or
            reading. New notices target active app accounts at publication.
            Historical audience labels do not establish who received a notice.
          </p>
          <p className="text-cal-muted">
            Deletion is unavailable pending retention review. A correction needs
            a new notice; messages already shown on devices cannot be recalled.
          </p>
        </div>
        <footer className="flex shrink-0 justify-end border-t border-cal-hairline p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-cal-primary px-4 py-2 text-sm font-semibold text-cal-on-primary"
          >
            Close
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
};
export default ViewBroadcastModal;
