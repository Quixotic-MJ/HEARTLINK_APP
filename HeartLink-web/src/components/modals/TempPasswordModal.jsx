import { useRef, useState } from "react";
import { Check, Copy, Info, KeyRound } from "lucide-react";
import { useDialogFocus } from "../../hooks/useDialogFocus";

// HL-044: shows a new staff member's one-time temporary password. The backend returns it once
// and never stores it, so this is the only time it can be seen.
const TempPasswordModal = ({ isOpen, onClose, staffName, staffEmail, password }) => {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef(null);
  // Intentionally no Escape-to-dismiss so the admin doesn't lose the one-time password accidentally
  useDialogFocus(isOpen, dialogRef, null);

  if (!isOpen || !password) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the password stays selectable for a manual copy.
    }
  };

  const handleClose = () => {
    setCopied(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-cal-sans">
      <div className="fixed inset-0 bg-cal-ink/40 transition-opacity" />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="temp-password-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 sm:p-7 text-left text-cal-ink shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-cal-success/25 bg-cal-success/10 text-cal-success">
          <KeyRound size={18} />
        </div>

        <h3
          id="temp-password-title"
          className="font-cal-display text-[22px] font-semibold tracking-[-0.5px] leading-[1.2] text-cal-ink"
        >
          Account created
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-[1.5] text-cal-muted">
          Share this temporary password privately with{" "}
          <span className="font-semibold text-cal-ink">{staffName}</span>
          {staffEmail ? (
            <>
              {" "}
              (<span className="font-cal-mono text-[12.5px]">{staffEmail}</span>)
            </>
          ) : null}
          . They will be prompted to set their own password on first sign-in.
        </p>

        <div className="mt-5">
          <label
            htmlFor="temp-password-value"
            className="mb-1.5 block text-[12.5px] font-semibold text-cal-ink"
          >
            Temporary password
          </label>
          <div className="flex items-stretch gap-2">
            <input
              id="temp-password-value"
              readOnly
              value={password}
              onFocus={(e) => e.target.select()}
              className="h-10 min-w-0 flex-1 rounded-[8px] border border-cal-hairline bg-cal-surface-soft px-3.5 font-cal-mono text-[14px] font-semibold text-cal-ink focus:border-cal-ink focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex h-10 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[13px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
            >
              {copied ? (
                <>
                  <Check size={14} className="text-cal-success" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-cal-warning/35 bg-cal-warning/10 p-3.5 text-[12.5px] leading-[1.45] text-cal-ink">
          <Info size={14} className="mt-0.5 shrink-0 text-cal-ink" />
          <span>
            This is the only time this password is shown. Copy it before closing this window.
          </span>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="mt-6 flex h-10 w-full items-center justify-center rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[14px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
        >
          I&apos;ve copied it
        </button>
      </div>
    </div>
  );
};

export default TempPasswordModal;
