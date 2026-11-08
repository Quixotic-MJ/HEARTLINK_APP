import { useEffect, useRef, useState } from "react";
import { Loader2, Megaphone, X } from "lucide-react";
import { useDialogFocus } from "../../../hooks/useDialogFocus.js";

export default function NewBroadcastModal({ onClose, onPublish }) {
  const dialogRef = useRef(null);
  const messageRef = useRef(null);
  const backRef = useRef(null);
  const pending = useRef(false);
  const [draft, setDraft] = useState({
    title: "",
    message: "",
    type: "Maintenance",
  });
  const [stage, setStage] = useState("edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dirty = Boolean(draft.title || draft.message);
  const close = () => {
    if (pending.current) return;
    if (stage !== "edit") {
      setStage("edit");
      return;
    }
    if (dirty) setStage("discard");
    else onClose();
  };
  useDialogFocus(true, dialogRef, close);
  useEffect(() => {
    if (error) messageRef.current?.focus();
    else if (stage !== "edit") backRef.current?.focus();
  }, [error, stage]);

  const submit = async (event) => {
    event.preventDefault();
    if (pending.current) return;
    if (!draft.title.trim() || !draft.message.trim()) return;
    if (stage === "edit") {
      setStage("confirm");
      return;
    }
    if (stage !== "confirm") return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await onPublish({
        ...draft,
        title: draft.title.trim(),
        message: draft.message.trim(),
        targetAudience: "All Registered Accounts",
      });
      onClose();
    } catch (failure) {
      const detail = failure?.data?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : "Publication was not confirmed. Check the announcement list before retrying if the connection was interrupted.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans">
      <div className="fixed inset-0 bg-cal-ink/40" onClick={close} />
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-broadcast-title"
        aria-busy={busy}
        tabIndex={-1}
        onSubmit={submit}
        className="relative flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-xl border border-cal-hairline bg-cal-canvas text-cal-ink shadow-xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-cal-hairline px-5 py-4">
          <Megaphone
            size={20}
            aria-hidden="true"
            className="mt-1 shrink-0 text-cal-primary"
          />
          <div className="min-w-0 flex-1">
            <h2
              id="create-broadcast-title"
              className="font-cal-display text-xl font-semibold"
            >
              {stage === "discard"
                ? "Discard announcement draft?"
                : stage === "confirm"
                  ? "Review announcement"
                  : "Create announcement"}
            </h2>
            <p className="mt-1 text-sm text-cal-muted">
              General service notices, not individualized health advice.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Close announcement"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cal-hairline disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          {error && (
            <p
              ref={messageRef}
              role="alert"
              tabIndex={-1}
              className="rounded-lg border border-cal-error/30 bg-cal-error/10 p-3 text-sm"
            >
              {error}
            </p>
          )}
          {stage === "discard" ? (
            <p className="text-sm">
              This unsaved draft will be lost. No announcement has been
              published.
            </p>
          ) : (
            <>
              <div className="rounded-lg border border-cal-hairline bg-cal-surface-soft p-3 text-sm">
                <p className="font-semibold">
                  Destination: app notification inbox
                </p>
                <p className="mt-1 text-cal-muted">
                  Audience: active app accounts at publication, not staff
                  accounts or a health-risk group. Push/display/read delivery is
                  not guaranteed.
                </p>
              </div>
              {stage === "edit" ? (
                <fieldset disabled={busy} className="min-w-0 space-y-4">
                  <legend className="sr-only">Announcement content</legend>
                  <label
                    className="block text-sm font-medium"
                    htmlFor="broadcast-title"
                  >
                    Announcement title
                    <input
                      id="broadcast-title"
                      required
                      maxLength={80}
                      value={draft.title}
                      onChange={(e) =>
                        setDraft({ ...draft, title: e.target.value })
                      }
                      className="mt-1 block h-11 w-full rounded-lg border border-cal-hairline bg-cal-canvas px-3"
                    />
                    <span className="mt-1 block text-xs text-cal-muted">
                      {draft.title.length} / 80
                    </span>
                  </label>
                  <label
                    className="block text-sm font-medium"
                    htmlFor="broadcast-category"
                  >
                    Category
                    <select
                      id="broadcast-category"
                      value={draft.type}
                      onChange={(e) =>
                        setDraft({ ...draft, type: e.target.value })
                      }
                      className="mt-1 block h-11 w-full rounded-lg border border-cal-hairline bg-cal-canvas px-3"
                    >
                      {[
                        "Maintenance",
                        "App Update",
                        "Safety Reminder",
                        "General",
                      ].map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label
                    className="block text-sm font-medium"
                    htmlFor="broadcast-message"
                  >
                    Announcement message
                    <textarea
                      id="broadcast-message"
                      required
                      maxLength={255}
                      rows={4}
                      value={draft.message}
                      onChange={(e) =>
                        setDraft({ ...draft, message: e.target.value })
                      }
                      className="mt-1 block w-full rounded-lg border border-cal-hairline bg-cal-canvas p-3"
                    />
                    <span className="mt-1 block text-xs text-cal-muted">
                      {draft.message.length} / 255
                    </span>
                  </label>
                </fieldset>
              ) : (
                <div className="space-y-3 break-words rounded-lg border border-cal-hairline p-4">
                  <p className="text-xs text-cal-muted">{draft.type}</p>
                  <h3 className="font-semibold">{draft.title.trim()}</h3>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {draft.message.trim()}
                  </p>
                </div>
              )}
              <p className="text-xs leading-relaxed text-cal-muted">
                Keep notices factual. Health education needs appropriate review;
                publishing here is not clinical approval. Published notices are
                retained pending retention review and cannot be recalled from
                devices.
              </p>
            </>
          )}
        </div>
        <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-cal-hairline p-4">
          {stage === "discard" ? (
            <>
              <button
                ref={backRef}
                type="button"
                onClick={() => setStage("edit")}
                className="rounded-lg border border-cal-hairline px-4 py-2 text-sm font-semibold"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg bg-cal-error px-4 py-2 text-sm font-semibold text-cal-on-primary"
              >
                Discard draft
              </button>
            </>
          ) : (
            <>
              <button
                ref={backRef}
                type="button"
                disabled={busy}
                onClick={close}
                className="rounded-lg border border-cal-hairline px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {stage === "confirm" ? "Back to edit" : "Cancel"}
              </button>
              <button
                type="submit"
                disabled={busy || !draft.title.trim() || !draft.message.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-cal-primary px-4 py-2 text-sm font-semibold text-cal-on-primary disabled:bg-cal-primary-disabled disabled:text-cal-muted"
              >
                {busy && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                )}
                {busy
                  ? "Publishing…"
                  : stage === "confirm"
                    ? "Publish announcement"
                    : "Review announcement"}
              </button>
            </>
          )}
        </footer>
      </form>
    </div>
  );
}
