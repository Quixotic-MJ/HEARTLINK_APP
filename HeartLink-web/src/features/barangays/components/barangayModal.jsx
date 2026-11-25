import { createPortal } from "react-dom";
import { useRef, useState } from "react";
import { ExternalLink, House, X } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "../../../lib/api.js";
import { useDialogFocus } from "../../../hooks/useDialogFocus.js";
import { formErrors, mapLink, numbersChanged, toForm, toPayload } from "../barangayForm.js";

// HL-171 (panel revision): add or edit a barangay's emergency contacts. A number only reaches the app once an admin
// has called it and ticked "I called this number and it works"; changing a number clears that tick.

const INPUT =
  "h-10 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[14px] text-cal-ink outline-none focus:border-cal-ink";

function Field({ id, label, hint, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[13px] font-semibold text-cal-ink">
        {label} {hint ? <span className="font-normal text-cal-muted">{hint}</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[12.5px] font-medium text-cal-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export default function BarangayModal({ row, onClose, onSaved }) {
  const dialogRef = useRef(null);
  const [form, setForm] = useState(() => toForm(row));
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  useDialogFocus(true, dialogRef, busy ? null : onClose);

  const errors = formErrors(form);
  const show = (k) => (tried ? errors[k] : undefined);
  const set = (k) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      // A changed number has to be checked again
      if ((k === "hotline_1" || k === "hotline_2") && row && numbersChanged(next, row)) next.numbers_checked = false;
      return next;
    });
  };
  const hasLocation = form.latitude.trim() && form.longitude.trim() && !errors.location;

  const save = async (event) => {
    event.preventDefault();
    setTried(true);
    if (Object.keys(errors).length) return;
    const payload = toPayload(form, row);
    if (row && Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      const saved = await apiFetch(row ? `/api/admin/barangays/${row.id}` : "/api/admin/barangays", {
        method: row ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      toast.success(row ? `${saved.name || form.name} saved.` : `${saved.name || form.name} added.`);
      onSaved();
    } catch (e) {
      toast.error(e?.data?.detail || "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans">
      <div className="fixed inset-0 bg-cal-ink/40" onClick={busy ? undefined : onClose} />
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="barangay-modal-title"
        aria-busy={busy}
        tabIndex={-1}
        onSubmit={save}
        className="relative flex max-h-full w-full max-w-[560px] flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-xl"
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-cal-hairline px-5 py-4">
          <House size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-cal-primary" />
          <div className="min-w-0 flex-1">
            <h2 id="barangay-modal-title" className="text-[17px] font-semibold">
              {row ? `Edit ${row.name}` : "Add a barangay"}
            </h2>
            <p className="text-[13px] text-cal-muted">The app shows the nearest barangay to each user, found by their location.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] text-cal-muted hover:bg-cal-surface-soft cursor-pointer"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex flex-col gap-4 overflow-y-auto px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="b-name" label="Barangay" error={show("name")}>
              <input id="b-name" className={INPUT} value={form.name} onChange={set("name")} placeholder="For example Lahug" />
            </Field>
            <Field id="b-city" label="City">
              <input id="b-city" className={INPUT} value={form.city} onChange={set("city")} />
            </Field>
          </div>
          <Field id="b-address" label="Hall address" hint="(optional)">
            <input id="b-address" className={INPUT} value={form.hall_address} onChange={set("hall_address")} />
          </Field>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-1 text-[13px] font-semibold text-cal-ink">Map location</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <input aria-label="Latitude" className={INPUT} value={form.latitude} onChange={set("latitude")} placeholder="Latitude, e.g. 10.3311" />
              <input aria-label="Longitude" className={INPUT} value={form.longitude} onChange={set("longitude")} placeholder="Longitude, e.g. 123.9003" />
            </div>
            {show("location") ? (
              <p role="alert" className="text-[12.5px] font-medium text-cal-error">{errors.location}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 text-[13px]">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="b-kind" checked={form.location_kind === "hall"} onChange={() => setForm((f) => ({ ...f, location_kind: "hall" }))} />
                The barangay hall
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input type="radio" name="b-kind" checked={form.location_kind === "centre"} onChange={() => setForm((f) => ({ ...f, location_kind: "centre" }))} />
                The middle of the barangay (approximate)
              </label>
              {hasLocation ? (
                <a
                  href={mapLink(form.latitude.trim(), form.longitude.trim())}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-cal-ink underline underline-offset-2"
                >
                  Open in Google Maps <ExternalLink size={13} aria-hidden="true" />
                </a>
              ) : null}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="b-h1" label="Hotline" error={show("hotline_1")}>
              <input id="b-h1" className={INPUT} inputMode="tel" value={form.hotline_1} onChange={set("hotline_1")} placeholder="032 255 1234" />
            </Field>
            <Field id="b-h2" label="Second hotline" hint="(optional)" error={show("hotline_2")}>
              <input id="b-h2" className={INPUT} inputMode="tel" value={form.hotline_2} onChange={set("hotline_2")} />
            </Field>
          </div>

          <div className="rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-[13.5px]">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={form.numbers_checked} onChange={set("numbers_checked")} />
              <span>
                <span className="font-semibold text-cal-ink">I called this number and it works</span>
                <span className="block text-cal-muted">
                  Only checked numbers get a Call button in the app. Changing a number clears this tick.
                </span>
              </span>
            </label>
            {show("numbers_checked") ? (
              <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-cal-error">{errors.numbers_checked}</p>
            ) : null}
          </div>

          <Field id="b-note" label="Note" hint="(optional, only admins see it)">
            <textarea id="b-note" rows={2} className={`${INPUT} h-auto py-2`} value={form.note} onChange={set("note")} />
          </Field>
        </div>

        <footer className="flex shrink-0 justify-end gap-2 border-t border-cal-hairline px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[14px] font-semibold hover:bg-cal-surface-soft cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-10 items-center rounded-[8px] bg-cal-primary px-5 text-[14px] font-semibold text-cal-on-primary cursor-pointer disabled:bg-cal-primary-disabled"
          >
            {busy ? "Saving…" : row ? "Save" : "Add barangay"}
          </button>
        </footer>
      </form>
    </div>,
    document.body
  );
}
