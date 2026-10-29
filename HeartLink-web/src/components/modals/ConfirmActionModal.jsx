import { useRef, useState } from "react";
import {
  AlertTriangle,
  Info,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { useDialogFocus } from "../../hooks/useDialogFocus";

const VARIANTS = {
  danger: {
    iconSurface: "border-cal-error/25 bg-cal-error/10 text-cal-error",
    btnClass:
      "bg-cal-error hover:opacity-90 active:opacity-95 text-cal-on-primary",
  },
  warning: {
    iconSurface: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
    btnClass:
      "bg-cal-primary active:bg-cal-primary-active text-cal-on-primary",
  },
  primary: {
    iconSurface: "border-cal-hairline bg-cal-surface-card text-cal-ink",
    btnClass:
      "bg-cal-primary active:bg-cal-primary-active text-cal-on-primary",
  },
  success: {
    iconSurface: "border-cal-success/25 bg-cal-success/10 text-cal-success",
    btnClass:
      "bg-cal-primary active:bg-cal-primary-active text-cal-on-primary",
  },
};

const ConfirmActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  description,
  confirmText = "Confirm Action",
  cancelText = "Cancel",
  variant = "danger",
  icon: CustomIcon,
  entityInfo = null,
  impactDetails = [],
  children = null,
}) => {
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef(null);
  useDialogFocus(isOpen, dialogRef, loading ? null : onClose);

  if (!isOpen) return null;

  const currentVariant = VARIANTS[variant] || VARIANTS.danger;
  const IconComponent = CustomIcon || (variant === "danger" ? Trash2 : AlertTriangle);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (onConfirm) {
        await onConfirm();
      }
    } finally {
      setLoading(false);
    }
    // Callers report success/failure via toasts; always dismiss once the action settles.
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-cal-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={!loading ? onClose : undefined}
      />

      {/* Modal Dialog (Cal.com 12px Card + Hairline + Whisper Shadow) */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-dialog-title"
        tabIndex={-1}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas p-6 sm:p-7 text-left text-cal-ink shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink transition-colors cursor-pointer disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Action Icon */}
        <div
          className={`mb-4 flex h-10 w-10 items-center justify-center rounded-full border ${currentVariant.iconSurface}`}
        >
          <IconComponent size={18} />
        </div>

        {/* Title & Subtitle */}
        <div>
          {subtitle && (
            <p className="mb-1 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-cal-muted">
              {subtitle}
            </p>
          )}
          <h3
            id="confirm-action-dialog-title"
            className="font-cal-display text-[22px] font-semibold tracking-[-0.5px] leading-[1.2] text-cal-ink pr-8"
          >
            {title}
          </h3>
          {description && (
            <p className="mt-1.5 text-[14px] leading-[1.5] text-cal-muted">
              {description}
            </p>
          )}
        </div>

        {/* Target Entity Card */}
        {entityInfo && (
          <div className="my-4 flex items-center gap-3 rounded-[12px] border border-cal-hairline bg-cal-surface-soft p-3.5 text-left">
            {entityInfo.avatar ? (
              entityInfo.avatar
            ) : (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-card text-[12px] font-semibold text-cal-ink">
                {(entityInfo.name || "U").substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-[13.5px] font-semibold text-cal-ink">
                  {entityInfo.name}
                </p>
                {entityInfo.badge && (
                  <span className="inline-flex items-center rounded-full border border-cal-hairline bg-cal-canvas px-2.5 py-0.5 text-[11px] font-medium text-cal-muted">
                    {entityInfo.badge}
                  </span>
                )}
              </div>
              {entityInfo.email && (
                <p className="mt-0.5 truncate text-[12px] text-cal-muted">
                  {entityInfo.email}
                </p>
              )}
              {entityInfo.id && (
                <p className="mt-0.5 truncate font-cal-mono text-[11.5px] text-cal-muted-soft">
                  ID: {entityInfo.id}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Impact Details Box */}
        {impactDetails.length > 0 && (
          <div className="my-4 space-y-2 rounded-[10px] border border-cal-hairline bg-cal-surface-soft p-3.5">
            {impactDetails.map((detail, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-[12.5px] leading-[1.45] text-cal-body"
              >
                <Info size={14} className="mt-0.5 shrink-0 text-cal-muted" />
                <span>{detail}</span>
              </div>
            ))}
          </div>
        )}

        {children}

        {/* Action Buttons */}
        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="h-10 flex-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[14px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-40"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-[8px] px-4 text-[14px] font-semibold transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted ${currentVariant.btnClass}`}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Processing…</span>
              </>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmActionModal;
