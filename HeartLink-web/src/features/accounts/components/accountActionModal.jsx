import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import { formatUserRef } from "../../../utils/formatUserRef.js";
import { useDialogFocus } from "../../../hooks/useDialogFocus.js";
import { useDraftExit } from "../../../hooks/useDraftExit.js";
import { StatusBadge } from "../../../styles/designSystem.jsx";
import { UI } from "../../../styles/tokens.js";

const REASONS = ["Suspicious activity", "Policy violation", "User request", "Other"];

export default function AccountActionModal({ isOpen, onClose, user, onToggleStatus, onChangePlan }) {
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [review, setReview] = useState(null);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const dialogRef = useRef(null);
  const errorRef = useRef(null);
  const backRef = useRef(null);
  const reviewOpener = useRef(null);
  // A review is not an unsaved draft; only an in-flight write blocks navigation/reload.
  const draftExit = useDraftExit(isOpen, false, onClose, dialogRef, busy);
  const close = () => {
    if (!pending.current) draftExit.requestClose();
  };
  useDialogFocus(isOpen, dialogRef, close);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  useEffect(() => {
    if (review) backRef.current?.focus();
    else if (reviewOpener.current) document.getElementById(reviewOpener.current)?.focus();
  }, [review]);

  if (!isOpen || !user) return null;
  const active = user.status === "Active";
  const canToggle = ["Active", "Disabled"].includes(user.status);
  const explanation = reason === "Other" ? customReason.trim() : reason;
  const endDate = user.premiumUntil ? new Date(user.premiumUntil).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila",
  }) : null;
  const currentPlan = user.isPremium ? `Premium${endDate ? " until " + endDate : ""}` : "Free plan";
  const startReview = (premium) => {
    if (pending.current) return;
    reviewOpener.current = document.activeElement?.id;
    setError("");
    setReview({ premium, days: premium ? days : undefined });
  };
  const back = () => {
    if (pending.current) return;
    setError("");
    setReview(null);
  };
  const run = async (action) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(failure.data?.detail || failure.message || "The account could not be updated. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-cal-sans">
      <div className="absolute inset-0 bg-cal-ink/40" onClick={close} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="account-title" tabIndex={-1} aria-busy={busy}
        className="account-dialog relative flex max-h-full w-full flex-col overflow-hidden border border-cal-hairline bg-cal-canvas text-cal-ink shadow-xl">
        <div className="account-dialog-header">
          <h2 id="account-title">App account</h2>
          <button type="button" onClick={close} disabled={busy} aria-label="Close account details" className={UI.button.icon}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="account-dialog-body">
          <div className="account-identity">
            <div>
              <h3>{user.name}</h3>
              <p className="mt-1 break-all font-cal-mono text-xs text-cal-muted">{formatUserRef(user.id)}</p>
            </div>
            <StatusBadge status={user.status} />
          </div>
          {review ? (
            <section className="premium-review" aria-labelledby="premium-review-title">
              <h3 id="premium-review-title">Review Premium change</h3>
              <p>Check the account and change before confirming.</p>
              <dl className="premium-review-facts">
                <div><dt>Current entitlement</dt><dd>{currentPlan}</dd></div>
                <div><dt>Change</dt><dd>{review.premium ? `${user.isPremium ? "Extend Premium" : "Give Premium"} · ${review.days} days` : "Remove Premium"}</dd></div>
              </dl>
              <p>{review.premium
                ? user.isPremium
                  ? "The server adds this time to the existing Premium end date. If Premium has expired when saved, time starts from the server’s current date. The server confirms the final end date."
                  : "Premium starts from the server’s current date when saved. The server confirms the final end date."
                : "Premium access ends when this change is saved. Existing records are retained."}</p>
              <p>This changes account access only. It does not charge a payment or provide clinical care.</p>
            </section>
          ) : (
            <>
              <dl className="account-facts">
                <div><dt>Registered</dt><dd>{user.regDate}</dd></div>
                <div><dt>Contact phone</dt><dd>{user.phone || "Not recorded"}</dd></div>
              </dl>
              {!active && user.deactivationReason && <p className="mb-4 break-words rounded-lg bg-cal-surface-soft p-3 text-sm">Disabled reason: {user.deactivationReason}</p>}
              <fieldset disabled={busy} className="account-action-section">
                <legend className="sr-only">Account access</legend>
                <div><h3>Sign-in access</h3><p>Access status is not recent app usage.</p></div>
                {!canToggle ? <p>No access action is available for this account state.</p> : confirmDisable ? (
                  <div className="w-full space-y-3">
                    <p>Disable sign-in until an Admin enables this account again. Existing records are retained.</p>
                    <label htmlFor="account-disable-reason" className={UI.input.label}>Reason for disabling</label>
                    <select id="account-disable-reason" value={reason} onChange={(event) => setReason(event.target.value)} className={UI.input.select + " w-full"}>
                      <option value="">Select a reason</option>
                      {REASONS.map((value) => <option key={value}>{value}</option>)}
                    </select>
                    {reason === "Other" && <>
                      <label htmlFor="account-custom-reason" className={UI.input.label}>Custom reason</label>
                      <textarea id="account-custom-reason" value={customReason} onChange={(event) => setCustomReason(event.target.value)} maxLength={300} rows={3}
                        placeholder="Account-support reason only; do not include health information." className={UI.input.textarea} />
                    </>}
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setConfirmDisable(false)} className={UI.button.secondary}>Cancel</button>
                      <button type="button" onClick={() => run(() => onToggleStatus(user.id, explanation))} disabled={!explanation} className={UI.button.primary}>{busy ? "Saving…" : "Confirm disable"}</button>
                    </div>
                  </div>
                ) : <button type="button" className={UI.button.secondary} onClick={() => active ? setConfirmDisable(true) : run(() => onToggleStatus(user.id, null))}>
                  {busy ? "Saving…" : active ? "Disable account" : "Enable account"}
                </button>}
              </fieldset>
              {onChangePlan && <fieldset disabled={busy} className="account-action-section">
                <legend className="sr-only">Optional entitlement</legend>
                <div><h3>Premium access</h3><p>{currentPlan}{!user.isPremium && endDate ? ` · previous Premium ended ${endDate}` : ""}</p></div>
                {user.isPremium && <button id="account-remove-premium" type="button" className={UI.button.ghost} onClick={() => startReview(false)}>Remove Premium</button>}
                <div className="account-premium-controls">
                  <div>
                    <label htmlFor="account-premium-days" className={UI.input.label}>Premium length</label>
                    <select id="account-premium-days" className={UI.input.select} value={days} onChange={(event) => setDays(Number(event.target.value))}>
                      <option value={30}>30 days</option><option value={90}>90 days</option><option value={365}>365 days (1 year)</option>
                    </select>
                  </div>
                  <button id="account-give-premium" type="button" className={UI.button.primary} onClick={() => startReview(true)}>{user.isPremium ? "Add Premium time" : "Give Premium"}</button>
                </div>
                <p>Account access only; no billing or clinical care.</p>
              </fieldset>}
            </>
          )}
          {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-lg border border-cal-error p-3 text-sm">{error}</p>}
        </div>
        <div className="account-dialog-footer">
          {review ? <>
            <button ref={backRef} type="button" onClick={back} disabled={busy} className={UI.button.secondary}><ArrowLeft size={15} aria-hidden="true" />Back</button>
            <button type="button" onClick={close} disabled={busy} className={UI.button.secondary}>Cancel</button>
            <button type="button" onClick={() => run(() => onChangePlan(user, review.premium, review.days))} disabled={busy} className={review.premium ? UI.button.primary : UI.button.danger}>
              {busy ? "Saving…" : review.premium ? "Confirm Premium change" : "Confirm removal"}
            </button>
          </> : <button type="button" onClick={close} disabled={busy} className={UI.button.secondary}>Close</button>}
        </div>
      </div>
    </div>, document.body,
  );
}
