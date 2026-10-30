import { useRef, useState } from "react";
import {
  X,
  MessageSquare,
  Smartphone,
  Save,
  Archive,
  Clock,
  User,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import FeedbackCategoryBadge from "../ui/FeedbackCategoryBadge";
import { apiFetch } from "../../api";
import { useDialogFocus } from "../../hooks/useDialogFocus";

const TicketModal = ({ isOpen, onClose, ticket, onUpdate, onArchive }) => {
  const dialogRef = useRef(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [ticketStatus, setTicketStatus] = useState("Open");

  // Keep track of original values to detect changes
  const [initialNotes, setInitialNotes] = useState("");
  const [initialStatus, setInitialStatus] = useState("Open");

  // Confirmation Overlays states
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Concurrency Conflict states
  const [conflictError, setConflictError] = useState(false);
  const [serverTicketData, setServerTicketData] = useState(null);

  // Load the ticket into the form when the modal opens on it
  const openKey = isOpen && ticket ? ticket.id : null;
  const [shownFor, setShownFor] = useState(null);
  if (openKey !== shownFor) {
    setShownFor(openKey);
    if (openKey !== null) {
      setAdminNotes(ticket.adminNotes || "");
      setTicketStatus(ticket.status || "Open");
      setInitialNotes(ticket.adminNotes || "");
      setInitialStatus(ticket.status || "Open");

      // Reset confirmation and error states
      setShowDiscardConfirm(false);
      setShowArchiveConfirm(false);
      setConflictError(false);
      setServerTicketData(null);
    }
  }

  // Intercept close events to check for dirty state
  const hasUnsavedChanges =
    adminNotes !== initialNotes || ticketStatus !== initialStatus;

  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const hasOverlay = showDiscardConfirm || showArchiveConfirm || conflictError;
  useDialogFocus(isOpen && !hasOverlay, dialogRef, handleCloseAttempt);

  if (!isOpen || !ticket) return null;

  // Check backend to verify no concurrent updates have occurred
  const checkConcurrencyConflict = async () => {
    try {
      const latestTickets = await apiFetch("/api/feedback/");
      if (latestTickets) {
        const serverTicket = latestTickets.find((t) => t.id === ticket.id);
        if (serverTicket) {
          const statusChanged = serverTicket.status !== initialStatus;
          const notesChanged = serverTicket.adminNotes !== initialNotes;
          if (statusChanged || notesChanged) {
            setServerTicketData(serverTicket);
            setConflictError(true);
            return true;
          }
        }
      }
    } catch (e) {
      console.error("Conflict check failed:", e);
    }
    return false;
  };

  const handleSave = async () => {
    const isConflict = await checkConcurrencyConflict();
    if (isConflict) return;
    onUpdate(ticket.id, ticketStatus, adminNotes);
  };

  const handleArchiveClick = () => {
    setShowArchiveConfirm(true);
  };

  const handleArchiveConfirmAction = async () => {
    const isConflict = await checkConcurrencyConflict();
    if (isConflict) {
      setShowArchiveConfirm(false);
      return;
    }
    onArchive(ticket.id, adminNotes);
    setShowArchiveConfirm(false);
  };

  const handleRestoreClick = async () => {
    const isConflict = await checkConcurrencyConflict();
    if (isConflict) return;
    onUpdate(ticket.id, "Open", adminNotes);
  };

  const isArchived = ticket.status === "Archived";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans text-cal-ink">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity cursor-pointer"
        onClick={handleCloseAttempt}
      />

      {/* Modal Panel */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        tabIndex={-1}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
      >
        {/* Custom Confirmation Overlays */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-cal-ink/50 p-6 backdrop-blur-[2px]">
            <div className="flex max-w-sm flex-col rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_12px_32px_rgba(0,0,0,0.15)] text-left">
              <h4 className="font-cal-display text-[17px] font-semibold text-cal-ink">
                Discard unsaved changes?
              </h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-cal-muted">
                You have unsaved changes in your notes or resolution status.
                Are you sure you want to discard them?
              </p>
              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-[8px] bg-cal-error px-3.5 text-[13px] font-semibold text-white hover:bg-cal-error/90 transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {showArchiveConfirm && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-cal-ink/50 p-6 backdrop-blur-[2px]">
            <div className="flex max-w-sm flex-col rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_12px_32px_rgba(0,0,0,0.15)] text-left">
              <h4 className="font-cal-display text-[17px] font-semibold text-cal-ink">
                Archive feedback ticket?
              </h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-cal-muted">
                Archived tickets are moved to cold storage but remain searchable
                and can be restored at any time.
              </p>
              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowArchiveConfirm(false)}
                  className="inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleArchiveConfirmAction}
                  className="inline-flex h-9 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-3.5 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                >
                  Archive ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {conflictError && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-cal-ink/50 p-6 backdrop-blur-[2px]">
            <div className="flex max-w-sm flex-col rounded-[12px] border border-cal-hairline bg-cal-canvas p-5 shadow-[0_12px_32px_rgba(0,0,0,0.15)] text-left">
              <h4 className="flex items-center gap-1.5 font-cal-display text-[17px] font-semibold text-cal-error">
                <AlertCircle size={16} /> Conflict detected
              </h4>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-cal-muted">
                This ticket was updated by another administrator. Reload the
                latest version before saving your changes.
              </p>
              <div className="mt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConflictError(false)}
                  className="inline-flex h-9 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (serverTicketData) {
                      setAdminNotes(serverTicketData.adminNotes || "");
                      setTicketStatus(serverTicketData.status || "Open");
                      setInitialNotes(serverTicketData.adminNotes || "");
                      setInitialStatus(serverTicketData.status || "Open");
                    }
                    setConflictError(false);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-3.5 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                >
                  Reload latest
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
              <MessageSquare size={16} aria-hidden="true" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3
                  id="ticket-modal-title"
                  className="font-cal-mono text-[17px] font-semibold tabular-nums text-cal-ink"
                >
                  {ticket.ticketId}
                </h3>
                <FeedbackCategoryBadge category={ticket.category} />
              </div>
              <p className="mt-0.5 flex items-center gap-1 font-cal-mono text-[11.5px] tabular-nums text-cal-muted">
                <Clock size={11} aria-hidden="true" />
                <span>Submitted {ticket.date}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseAttempt}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Account Context */}
          <div className="flex items-center justify-between rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted">
                <User size={12} aria-hidden="true" />
              </div>
              <div>
                <p className="text-[11.5px] font-medium text-cal-muted">
                  Account reference
                </p>
                <p className="font-cal-mono text-[13px] font-semibold tabular-nums text-cal-ink">
                  {ticket.userId || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Full Issue Description */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-cal-muted">
              <MessageSquare size={12} className="text-cal-ink" />
              <span>User message</span>
            </h4>
            <div className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-4">
              <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-cal-ink">
                {ticket.fullMessage || "No message provided."}
              </p>
            </div>
          </div>

          {/* Device Metadata */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-cal-muted">
              <Smartphone size={12} className="text-cal-ink" />
              <span>Device metadata</span>
            </h4>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-cal-hairline bg-cal-hairline text-[12.5px]">
              <div className="bg-cal-canvas p-3">
                <p className="text-[11px] font-medium text-cal-muted">
                  Operating system
                </p>
                <p className="mt-0.5 font-semibold text-cal-ink">
                  {ticket.deviceMeta?.os || "N/A"}
                </p>
              </div>
              <div className="bg-cal-canvas p-3">
                <p className="text-[11px] font-medium text-cal-muted">
                  App version
                </p>
                <p className="mt-0.5 font-cal-mono font-semibold tabular-nums text-cal-ink">
                  {ticket.deviceMeta?.appVersion || "N/A"}
                </p>
              </div>
              <div className="col-span-2 bg-cal-canvas p-3">
                <p className="text-[11px] font-medium text-cal-muted">
                  Device model
                </p>
                <p className="mt-0.5 font-semibold text-cal-ink">
                  {ticket.deviceMeta?.model || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Resolution Area */}
          <div>
            <h4 className="mb-1.5 flex items-center gap-1.5 text-[12px] font-medium text-cal-muted">
              <Save size={12} className="text-cal-ink" />
              <span>Resolution logging</span>
            </h4>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="admin-ticket-notes"
                  className="mb-1 block text-[13px] font-medium text-cal-ink"
                >
                  Admin / Developer notes
                </label>
                <textarea
                  id="admin-ticket-notes"
                  rows="3"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full resize-none rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 py-2.5 text-[13.5px] leading-relaxed text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
                  placeholder="Log root cause of issue or deployed fixes…"
                />
              </div>

              {!isArchived ? (
                <div>
                  <label
                    htmlFor="admin-ticket-status"
                    className="mb-1 block text-[13px] font-medium text-cal-ink"
                  >
                    Ticket status
                  </label>
                  <select
                    id="admin-ticket-status"
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className="h-10 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13.5px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5">
                  <div>
                    <p className="text-[11.5px] font-medium text-cal-muted">
                      Current status
                    </p>
                    <p className="font-semibold text-cal-ink">Archived</p>
                  </div>
                  <span className="text-[12px] text-cal-muted">
                    Restoring returns ticket to Open
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="flex shrink-0 items-center justify-between border-t border-cal-hairline bg-cal-canvas px-6 py-4">
          {!isArchived ? (
            <button
              type="button"
              onClick={handleArchiveClick}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink transition-colors cursor-pointer"
              title="Archive submission"
            >
              <Archive size={14} />
              <span>Archive</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRestoreClick}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
              title="Restore archived ticket"
            >
              <RotateCcw size={14} />
              <span>Restore ticket</span>
            </button>
          )}

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCloseAttempt}
              className="inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {!isArchived && (
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex h-10 items-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
              >
                <Save size={14} />
                <span>Update ticket</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
