import { useRef, useState } from "react";
import {
  CheckCircle2,
  Info,
  Megaphone,
  ShieldAlert,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import ConfirmActionModal from "./ConfirmActionModal";
import { useDialogFocus } from "../../hooks/useDialogFocus";

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
    default:
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
  }
};

const ViewBroadcastModal = ({ isOpen, onClose, broadcast, onDelete }) => {
  const dialogRef = useRef(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useDialogFocus(isOpen && !isDeleteConfirmOpen, dialogRef, onClose);

  if (!isOpen || !broadcast) return null;

  const publisherName =
    broadcast.display_publisher ||
    (broadcast.publisher
      ? broadcast.publisher.replace(/^[^(]+\((.+)\)$/, "$1")
      : "System Admin");

  const handleConfirmDelete = async () => {
    setIsDeleteConfirmOpen(false);
    await onDelete(broadcast.id);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans">
        <div
          className="fixed inset-0 bg-cal-ink/40 transition-opacity cursor-pointer"
          onClick={onClose}
        />

        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-broadcast-title"
          tabIndex={-1}
          className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-6 pt-5 pb-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-medium text-cal-muted">
                  Announcement details
                </span>
                <CategoryBadge category={broadcast.type} />
              </div>
              <h3
                id="view-broadcast-title"
                className="font-cal-display text-[21px] sm:text-[23px] font-semibold tracking-[-0.5px] leading-[1.2] text-cal-ink"
              >
                {broadcast.title || broadcast.type || "Announcement"}
              </h3>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-hairline">
              <div className="bg-cal-canvas px-4 py-3">
                <p className="text-[11.5px] font-medium text-cal-muted">
                  Published on
                </p>
                <p className="mt-1 font-cal-mono text-[13.5px] font-semibold tabular-nums text-cal-ink">
                  {broadcast.date || "—"}
                </p>
              </div>
              <div className="bg-cal-canvas px-4 py-3">
                <p className="text-[11.5px] font-medium text-cal-muted">
                  Published by
                </p>
                <p className="mt-1 truncate text-[13.5px] font-semibold text-cal-ink">
                  {publisherName}
                </p>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <p className="mb-1.5 text-[12.5px] font-semibold text-cal-ink">
                Message content
              </p>
              <div className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4">
                <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-cal-ink">
                  {broadcast.message}
                </p>
              </div>
            </div>

            {/* Delivery Receipt (when provided by API) */}
            {typeof broadcast.recipients_count === "number" && (
              <div className="flex items-center justify-between gap-3 rounded-[10px] border border-cal-success/25 bg-cal-success/10 px-4 py-3">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-cal-ink">
                  <CheckCircle2
                    size={15.5}
                    className="text-cal-success"
                    aria-hidden="true"
                  />
                  <span>Delivered to active accounts</span>
                </span>
                <span className="rounded-full border border-cal-success/25 bg-cal-canvas px-2.5 py-0.5 font-cal-mono text-[12px] font-semibold tabular-nums text-cal-ink">
                  {broadcast.recipients_count}{" "}
                  {broadcast.recipients_count === 1
                    ? "recipient"
                    : "recipients"}
                </span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-cal-hairline bg-cal-canvas px-6 py-4">
            <button
              type="button"
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-cal-error/30 bg-cal-canvas px-3.5 text-[13.5px] font-semibold text-cal-error hover:bg-cal-error/10 transition-colors cursor-pointer"
            >
              <Trash2 size={14.5} />
              <span>Delete</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <ConfirmActionModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete announcement?"
        subtitle="Remove from user feeds"
        description={`Delete "${
          broadcast.title || "this announcement"
        }"? It will be removed from user announcement feeds immediately.`}
        confirmText="Delete announcement"
        cancelText="Cancel"
        variant="danger"
        icon={Trash2}
        entityInfo={{
          name: broadcast.title || "Announcement",
          badge: broadcast.type || "General",
          email: `Published ${broadcast.date || "recently"} by ${publisherName}`,
          id: broadcast.id,
        }}
        impactDetails={[
          "Removed immediately from mobile and web announcement feeds.",
          "This action cannot be undone.",
        ]}
      />
    </>
  );
};

export default ViewBroadcastModal;
