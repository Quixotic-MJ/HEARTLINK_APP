import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import FeedbackCategoryBadge from "./feedbackCategoryBadge.jsx";
import { useDialogFocus } from "../../../hooks/useDialogFocus.js";
import { useDraftExit } from "../../../hooks/useDraftExit.js";
import { UI } from "../../../styles/tokens.js";

export default function TicketModal({
  isOpen,
  onClose,
  ticket,
  onUpdate,
  onArchive,
}) {
  const [notes, setNotes] = useState(ticket?.adminNotes || "");
  const [status, setStatus] = useState(ticket?.status || "Unknown");
  const [mode, setMode] = useState("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const dialogRef = useRef(null);
  const errorRef = useRef(null);
  const notesRef = useRef(null);
  const cancelRef = useRef(null);
  const dirty =
    notes !== (ticket?.adminNotes || "") || status !== ticket?.status;
  const draftExit = useDraftExit(isOpen, dirty, onClose, dialogRef, busy);
  const view = draftExit.discarding ? "discard" : mode;
  const close = () => {
    if (pending.current) return;
    if (draftExit.discarding) draftExit.keepEditing();
    else if (mode !== "edit") setMode("edit");
    else draftExit.requestClose();
  };
  useDialogFocus(isOpen, dialogRef, close);
  useEffect(() => {
    if (view !== "edit") cancelRef.current?.focus();
    else notesRef.current?.focus();
  }, [view]);
  if (!isOpen || !ticket) return null;
  const archived = ticket.status === "Archived";
  const knownStatus = ["Open", "In Progress", "Resolved", "Archived"].includes(
    ticket.status,
  );
  const revision = ticket.updated_at;
  const canUpdate = !!revision && knownStatus;
  const run = async (nextStatus) => {
    if (pending.current || !canUpdate) return;
    pending.current = true;
    setBusy(true);
    setError("");
    const changedNotes =
      notes !== (ticket.adminNotes || "") ? notes : undefined;
    try {
      if (nextStatus === "Archived")
        await onArchive(ticket.id, changedNotes, revision);
      else await onUpdate(ticket.id, nextStatus, changedNotes, revision);
    } catch (failure) {
      const detail = failure.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Could not save this ticket. Your draft is kept here.",
      );
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const metadata = (key) =>
    typeof ticket.deviceMeta?.[key] === "string"
      ? ticket.deviceMeta[key]
      : "Not recorded";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-cal-sans text-cal-ink">
      <div className="absolute inset-0 bg-cal-ink/40" onClick={close} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ticket-modal-title"
        tabIndex={-1}
        aria-busy={busy}
        data-view={view}
        className="workspace workspace--operations operation-modal relative flex max-h-full w-full flex-col overflow-hidden border border-cal-hairline bg-cal-canvas"
      >
        <div className="flex items-start justify-between gap-3 border-b border-cal-hairline p-5">
          <div>
            <h2 id="ticket-modal-title" className="text-lg font-semibold">
              {ticket.ticketId || "Support ticket"}
            </h2>
            <p className="mt-1 text-sm text-cal-muted">
              Account, technical and content feedback—not a medical-advice
              inbox.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Close ticket"
            className={UI.button.icon}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-5">
          {error && (
            <p
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="rounded-lg border border-cal-error p-3 text-sm"
            >
              {error} Your unsaved notes are retained.
            </p>
          )}
          {view === "discard" ? (
            <section className="space-y-4" aria-labelledby="discard-heading">
              <h3 id="discard-heading" className="font-semibold">
                Discard unsaved changes?
              </h3>
              <p className="text-sm text-cal-muted">
                Closing will discard your draft notes and status selection.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={draftExit.keepEditing}
                  className={UI.button.secondary}
                >
                  Keep editing
                </button>
                <button
                  type="button"
                  onClick={draftExit.confirmDiscard}
                  className={UI.button.secondary}
                >
                  Discard draft
                </button>
              </div>
            </section>
          ) : view === "archive" ? (
            <section className="space-y-4" aria-labelledby="archive-heading">
              <h3 id="archive-heading" className="font-semibold">
                Archive support ticket?
              </h3>
              <p className="text-sm text-cal-muted">
                The ticket stays searchable and can be restored. Archiving does
                not delete its records or send a reply.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  ref={cancelRef}
                  type="button"
                  onClick={() => setMode("edit")}
                  disabled={busy}
                  className={UI.button.secondary}
                >
                  Cancel archive
                </button>
                <button
                  type="button"
                  onClick={() => run("Archived")}
                  disabled={busy}
                  className={UI.button.primary}
                >
                  {busy ? "Archiving…" : "Confirm archive"}
                </button>
              </div>
            </section>
          ) : (
            <>
              <div className="ticket-review-layout">
                <section
                  className="ticket-message-pane"
                  aria-label="Submitted feedback"
                >
                  <FeedbackCategoryBadge category={ticket.category} />
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-cal-muted">Account reference</dt>
                      <dd className="break-all font-cal-mono text-xs">
                        {ticket.userId || "Not recorded"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-cal-muted">Submitted</dt>
                      <dd>
                        {ticket.created_at
                          ? new Date(ticket.created_at).toLocaleString(
                              "en-PH",
                              {
                                timeZone: "Asia/Manila",
                              },
                            ) + " (Asia/Manila)"
                          : ticket.date || "Not recorded"}
                      </dd>
                    </div>
                  </dl>
                  <section aria-labelledby="ticket-message-heading">
                    <h3
                      id="ticket-message-heading"
                      className="mb-2 text-sm font-semibold"
                    >
                      User message
                    </h3>
                    <p className="break-words whitespace-pre-wrap rounded-lg border border-cal-hairline bg-cal-surface-soft p-4 text-sm leading-relaxed">
                      {ticket.fullMessage || "No message recorded."}
                    </p>
                  </section>
                  <details className="rounded-lg border border-cal-hairline p-3 text-sm">
                    <summary className="cursor-pointer font-medium">
                      Technical metadata
                    </summary>
                    <dl className="mt-3 space-y-2 break-words">
                      {[
                        ["os", "Operating system"],
                        ["appVersion", "App version"],
                        ["model", "Device model"],
                      ].map(([key, label]) => (
                        <div key={key}>
                          <dt className="text-cal-muted">{label}</dt>
                          <dd>{metadata(key)}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                  {!canUpdate && (
                    <p className="text-sm text-cal-muted">
                      This ticket has no usable revision or status. Updates are
                      unavailable until the record can be refreshed.
                    </p>
                  )}
                </section>
                <section
                  className="ticket-notes-pane"
                  aria-label="Internal follow-up"
                >
                  <fieldset
                    disabled={busy || archived || !canUpdate}
                    className="space-y-3"
                  >
                    <div>
                      <label
                        htmlFor="support-internal-notes"
                        className={UI.input.label}
                      >
                        Internal Admin notes
                      </label>
                      <textarea
                        ref={notesRef}
                        id="support-internal-notes"
                        rows={4}
                        maxLength={4000}
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        aria-describedby="support-notes-boundary"
                        className={UI.input.textarea}
                        placeholder="Technical follow-up only; do not copy health readings or credentials."
                      />
                      <p
                        id="support-notes-boundary"
                        className="mt-2 text-xs leading-relaxed text-cal-muted"
                      >
                        Stored for staff only. Saving these notes does not
                        deliver a reply to the app user.
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="support-ticket-status"
                        className={UI.input.label}
                      >
                        Ticket status
                      </label>
                      <select
                        id="support-ticket-status"
                        value={status}
                        onChange={(event) => setStatus(event.target.value)}
                        className={UI.input.select + " w-full"}
                      >
                        {!knownStatus && (
                          <option value={status}>Unrecognised status</option>
                        )}
                        {["Open", "In Progress", "Resolved"].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                        {archived && <option>Archived</option>}
                      </select>
                    </div>
                  </fieldset>
                </section>
              </div>
            </>
          )}
        </div>
        {view === "edit" && (
          <div className="flex flex-wrap justify-between gap-2 border-t border-cal-hairline p-4">
            <button
              type="button"
              disabled={busy || !canUpdate}
              onClick={() => (archived ? run("Open") : setMode("archive"))}
              className={UI.button.secondary}
            >
              {archived ? "Restore ticket" : "Archive"}
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={close}
                disabled={busy}
                className={UI.button.secondary}
              >
                Close
              </button>
              {!archived && (
                <button
                  type="button"
                  disabled={busy || !dirty || !canUpdate}
                  onClick={() => run(status)}
                  className={UI.button.primary}
                >
                  {busy ? "Saving…" : "Save ticket"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
