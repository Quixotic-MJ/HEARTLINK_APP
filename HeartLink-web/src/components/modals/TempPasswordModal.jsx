import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { KeyRound, Copy, Check, Info } from "lucide-react";

// HL-044: shows a new staff member's one-time temporary password. The backend returns it once
// and never stores it, so this is the only time it can be seen.
const TempPasswordModal = ({ isOpen, onClose, staffName, staffEmail, password }) => {
  const [copied, setCopied] = useState(false);

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
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="temp-password-title"
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-ds-canvas rounded-2xl shadow-2xl border border-ds-hairline overflow-hidden text-ds-ink z-10"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <div className="h-1 w-full bg-gradient-to-r from-ds-primary via-ds-primary to-ds-warm-text" />

          <div className="p-6 sm:p-7">
            <div className="w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4 bg-ds-mint border-ds-mint text-ds-charcoal">
              <KeyRound size={24} />
            </div>

            <div className="text-center">
              <h3 id="temp-password-title" className="text-xl font-bold text-ds-ink tracking-tight">
                Account created
              </h3>
              <p className="text-xs text-ds-slate mt-2 leading-relaxed max-w-sm mx-auto">
                Give this temporary password to <span className="font-semibold text-ds-ink">{staffName}</span>
                {staffEmail ? <> ({staffEmail})</> : null} privately. They'll be asked to choose their own password the first time they sign in.
              </p>
            </div>

            <div className="mt-5">
              <label htmlFor="temp-password-value" className="block text-[13px] font-medium text-ds-ink mb-1.5">
                Temporary password
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  id="temp-password-value"
                  readOnly
                  value={password}
                  onFocus={(e) => e.target.select()}
                  className="flex-1 min-w-0 px-3.5 py-2.5 text-[14px] font-mono font-semibold text-ds-ink bg-ds-canvas border border-ds-hairline-strong rounded-[8px] focus:outline-none focus:border-ds-line"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3.5 rounded-[8px] text-xs font-semibold bg-ds-ink hover:bg-ds-ink text-white flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-ds-yellow/60 border border-ds-yellow-bold mt-4 flex items-start gap-2 text-[11px] text-ds-warm-text leading-snug">
              <Info size={13} className="shrink-0 mt-0.5" />
              <span>This is the only time this password is shown. Copy it before closing this window.</span>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full mt-6 py-2.5 px-4 rounded-lg text-xs font-semibold bg-ds-primary hover:bg-ds-primary text-white transition-colors cursor-pointer"
            >
              I've copied it
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default TempPasswordModal;
