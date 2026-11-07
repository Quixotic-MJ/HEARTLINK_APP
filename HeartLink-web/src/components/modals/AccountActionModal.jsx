import { useRef, useState } from "react";
import { X } from "lucide-react";
import { formatUserRef } from "../../utils/formatUserRef";
import { useDialogFocus } from "../../hooks/useDialogFocus";
import { StatusBadge } from "../../styles/designSystem";
import { UI } from "../../styles/tokens";

const REASONS = [
  "Suspicious activity",
  "Policy violation",
  "User request",
  "Other",
];

export default function AccountActionModal({
  isOpen,
  onClose,
  user,
  onToggleStatus,
  onChangePlan,
}) {
  const [confirmDisable, setConfirmDisable] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef(false);
  const dialogRef = useRef(null);
  const errorRef = useRef(null);
  const close = () => {
    if (!pending.current) onClose();
  };
  useDialogFocus(isOpen, dialogRef, close);
  if (!isOpen || !user) return null;
  const active = user.status === "Active";
  const canToggle = ["Active", "Disabled"].includes(user.status);
  const explanation = reason === "Other" ? customReason.trim() : reason;

  const run = async (action) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (failure) {
      setError(
        failure.data?.detail ||
          failure.message ||
          "The account could not be updated. Try again.",
      );
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 font-cal-sans">
      <div className="absolute inset-0 bg-cal-ink/40" onClick={close} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-title"
        tabIndex={-1}
        aria-busy={busy}
        className="relative flex max-h-full w-full max-w-md flex-col overflow-hidden rounded-xl border border-cal-hairline bg-cal-canvas text-cal-ink shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-cal-hairline p-5">
          <div>
            <h2 id="account-title" className="text-xl font-semibold">
              App account
            </h2>
            <p className="mt-1 text-sm text-cal-muted">
              Access and support details, not health records.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={busy}
            aria-label="Close account details"
            className={UI.button.icon}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="space-y-5 overflow-y-auto p-5">
          <div>
            <h3 className="font-semibold">{user.name}</h3>
            <p className="mt-1 break-all font-cal-mono text-xs text-cal-muted">
              {formatUserRef(user.id)}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="mb-1 text-cal-muted">Access</dt>
              <dd>
                <StatusBadge status={user.status} />
              </dd>
            </div>
            <div>
              <dt className="mb-1 text-cal-muted">Registered</dt>
              <dd>{user.regDate}</dd>
            </div>
            <div className="col-span-2">
              <dt className="mb-1 text-cal-muted">Contact phone</dt>
              <dd>{user.phone || "Not recorded"}</dd>
            </div>
          </dl>
          {!active && user.deactivationReason && (
            <p className="break-words rounded-lg bg-cal-surface-soft p-3 text-sm">
              Disabled reason: {user.deactivationReason}
            </p>
          )}
          {error && (
            <p
              ref={errorRef}
              tabIndex={-1}
              role="alert"
              className="rounded-lg border border-cal-error p-3 text-sm"
            >
              {error}
            </p>
          )}
          <fieldset disabled={busy} className="space-y-3">
            <legend className="mb-2 font-semibold">Account access</legend>
            {!canToggle ? (
              <p className="text-sm text-cal-muted">
                No access action is available for this account state.
              </p>
            ) : confirmDisable ? (
              <>
                <p className="text-sm text-cal-muted">
                  Disable sign-in access until an Admin enables the account
                  again. Existing records are retained.
                </p>
                <label
                  htmlFor="account-disable-reason"
                  className={UI.input.label}
                >
                  Reason for disabling
                </label>
                <select
                  id="account-disable-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={UI.input.select + " w-full"}
                >
                  <option value="">Select a reason</option>
                  {REASONS.map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                {reason === "Other" && (
                  <>
                    <label
                      htmlFor="account-custom-reason"
                      className={UI.input.label}
                    >
                      Custom reason
                    </label>
                    <textarea
                      id="account-custom-reason"
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      maxLength={300}
                      rows={3}
                      placeholder="Account-support reason only; do not include health information."
                      className={UI.input.textarea}
                    />
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDisable(false)}
                    className={UI.button.secondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      run(() => onToggleStatus(user.id, explanation))
                    }
                    disabled={!explanation}
                    className={UI.button.primary}
                  >
                    {busy ? "Saving…" : "Confirm disable"}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className={UI.button.secondary}
                onClick={() =>
                  active
                    ? setConfirmDisable(true)
                    : run(() => onToggleStatus(user.id, null))
                }
              >
                {busy
                  ? "Saving…"
                  : active
                    ? "Disable account"
                    : "Enable account"}
              </button>
            )}
          </fieldset>
          {onChangePlan && (
            <fieldset
              disabled={busy}
              className="space-y-3 border-t border-cal-hairline pt-4"
            >
              <legend className="px-1 font-semibold">
                Optional entitlement
              </legend>
              <p className="text-sm text-cal-muted">
                {user.isPremium ? "Premium" : "Free plan"}
                {user.isPremium && user.premiumUntil
                  ? " until " +
                    new Date(user.premiumUntil).toLocaleDateString("en-US", {
                      timeZone: "Asia/Manila",
                    })
                  : ""}
                . This is account access, not billing or clinical care.
              </p>
              <label htmlFor="account-premium-days" className={UI.input.label}>
                Premium length
              </label>
              <select
                id="account-premium-days"
                className={UI.input.select}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
              </select>
              <button
                type="button"
                className={UI.button.secondary}
                onClick={() => run(() => onChangePlan(user, true, days))}
              >
                {user.isPremium ? "Add Premium time" : "Give Premium"}
              </button>
              {user.isPremium &&
                (confirmRemove ? (
                  <div className="space-y-2">
                    <p className="text-sm">
                      Remove Premium access now? Existing records are retained.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={UI.button.secondary}
                        onClick={() => setConfirmRemove(false)}
                      >
                        Cancel removal
                      </button>
                      <button
                        type="button"
                        className={UI.button.secondary}
                        onClick={() => run(() => onChangePlan(user, false))}
                      >
                        Confirm removal
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={UI.button.ghost}
                    onClick={() => setConfirmRemove(true)}
                  >
                    Remove Premium
                  </button>
                ))}
            </fieldset>
          )}
        </div>
        <div className="flex justify-end border-t border-cal-hairline p-4">
          <button
            type="button"
            onClick={close}
            disabled={busy}
            className={UI.button.secondary}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
