import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Info, Loader2, Trash2, X } from "lucide-react";
import { useDialogFocus } from "../../hooks/useDialogFocus.js";

const VARIANTS = {
  danger: {
    iconSurface: "border-cal-error/25 bg-cal-error/10 text-cal-error",
    btnClass:
      "bg-cal-error hover:opacity-90 active:opacity-95 text-cal-on-primary",
  },
  warning: {
    iconSurface: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
    btnClass: "bg-cal-primary active:bg-cal-primary-active text-cal-on-primary",
  },
  primary: {
    iconSurface: "border-cal-hairline bg-cal-surface-card text-cal-ink",
    btnClass: "bg-cal-primary active:bg-cal-primary-active text-cal-on-primary",
  },
  success: {
    iconSurface: "border-cal-success/25 bg-cal-success/10 text-cal-success",
    btnClass: "bg-cal-primary active:bg-cal-primary-active text-cal-on-primary",
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
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const errorRef = useRef(null);
  const dialogRef = useRef(null);
  const close = () => {
    if (!inFlight.current) onClose?.();
  };
  useDialogFocus(isOpen, dialogRef, close);
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (wasOpen !== isOpen) {
    setWasOpen(isOpen);
    setError("");
  }
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (!isOpen) return null;

  const currentVariant = VARIANTS[variant] || VARIANTS.danger;
  const IconComponent =
    CustomIcon || (variant === "danger" ? Trash2 : AlertTriangle);

  const handleConfirm = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError("");
    try {
      if (onConfirm) {
        await onConfirm();
      }
      onClose?.();
    } catch (err) {
      setError(
        typeof err?.data?.detail === "string"
          ? err.data.detail
          : "The action could not be completed. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-cal-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity"
        onClick={close}
      />

      {/* A compact confirmation keeps the decision and its effects together. */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-action-dialog-title"
        tabIndex={-1}
        className="relative z-10 max-h-full w-full max-w-lg overflow-y-auto rounded-[20px] border border-cal-hairline bg-cal-canvas p-6 sm:p-7 text-left text-cal-ink shadow-[0_16px_60px_rgba(0,0,0,0.14)]"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={close}
          disabled={loading}
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:text-cal-ink transition-colors cursor-pointer disabled:opacity-40"
          aria-label="Close modal"
        >
          <X size={16} />
        </button>

        {/* Action Icon */}
        <div
          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-[15px] border ${currentVariant.iconSurface}`}
        >
          <IconComponent size={18} />
        </div>

        {/* Title & Subtitle */}
        <div>
          {subtitle && (
            <p className="mb-1.5 text-[13px] font-medium text-cal-muted">
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
          {error && (
            <p
              ref={errorRef}
              role="alert"
              tabIndex={-1}
              className="mt-3 rounded-[8px] border border-cal-error/30 bg-cal-error/5 p-3 text-[14px] text-cal-ink"
            >
              {error}
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
            onClick={close}
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
    </div>,
    document.body,
  );
};

export default ConfirmActionModal;
