import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  X,
  Loader2,
  Trash2,
  Info,
} from "lucide-react";

const VARIANTS = {
  danger: {
    iconBg: "bg-[#F7E4E1] border-[#F0C4B8] text-[#A93226]",
    pingBg: "bg-[#F7E4E1]",
    accentBar: "bg-gradient-to-r from-[#A93226] via-[#E8532E] to-[#A9741B]",
    btnColor: "bg-[#A93226] hover:bg-[#8A1F1A] text-white",
  },
  warning: {
    iconBg: "bg-[#F6EDDD] border-[#EBD7B8] text-[#A9741B]",
    pingBg: "bg-[#F6EDDD]",
    accentBar: "bg-gradient-to-r from-[#A9741B] via-[#E8532E] to-[#1B6E63]",
    btnColor: "bg-[#E8532E] hover:bg-[#C13E20] text-white",
  },
  primary: {
    iconBg: "bg-[#FBEAE6] border-[#F5C7BD] text-[#E8532E]",
    pingBg: "bg-[#FBEAE6]",
    accentBar: "bg-gradient-to-r from-[#E8532E] via-[#8A1F1A] to-[#1B6E63]",
    btnColor: "bg-[#152131] hover:bg-[#0d1622] text-white",
  },
  success: {
    iconBg: "bg-[#E3EFEC] border-[#C5DFD8] text-[#1B6E63]",
    pingBg: "bg-[#E3EFEC]",
    accentBar: "bg-gradient-to-r from-[#1B6E63] via-[#E8532E] to-[#A9741B]",
    btnColor: "bg-[#1B6E63] hover:bg-[#14534B] text-white",
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
}) => {
  const [loading, setLoading] = useState(false);

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
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          onClick={!loading ? onClose : undefined}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-[#FFFFFF] rounded-2xl shadow-2xl border border-[#DCE3DF] overflow-hidden text-[#152131] z-10"
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          {/* Top glowing line */}
          <div className={`h-1 w-full ${currentVariant.accentBar}`} />

          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-3.5 right-3.5 p-1.5 text-[#5C6B66] hover:text-[#152131] hover:bg-[#EDF1EF] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>

          <div className="p-6 sm:p-7">
            {/* Action Icon */}
            <div
              className={`relative w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4 ${currentVariant.iconBg}`}
            >
              <div
                className={`absolute inset-0 rounded-2xl animate-ping opacity-30 pointer-events-none ${currentVariant.pingBg}`}
              />
              <IconComponent size={24} className="relative z-10" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center">
              <h3 
                className="text-xl font-medium text-[#152131] tracking-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-[#E8532E] font-semibold mt-0.5 uppercase tracking-wider">
                  {subtitle}
                </p>
              )}
              {description && (
                <p className="text-xs text-[#5C6B66] mt-2 leading-relaxed max-w-sm mx-auto">
                  {description}
                </p>
              )}
            </div>

            {/* Target Entity Card */}
            {entityInfo && (
              <div className="p-3.5 rounded-xl bg-[#EDF1EF] border border-[#DCE3DF] flex items-center gap-3 my-4 text-left">
                {entityInfo.avatar ? (
                  entityInfo.avatar
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#FBEAE6] text-[#C13E20] font-bold text-xs flex items-center justify-center shrink-0">
                    {(entityInfo.name || "U").substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-[#152131] truncate">
                      {entityInfo.name}
                    </p>
                    {entityInfo.badge && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[#DCE3DF] bg-[#FFFFFF] text-[#5C6B66]">
                        {entityInfo.badge}
                      </span>
                    )}
                  </div>
                  {entityInfo.email && (
                    <p className="text-[10px] text-[#5C6B66] font-mono truncate mt-0.5">
                      {entityInfo.email}
                    </p>
                  )}
                  {entityInfo.id && (
                    <p className="text-[9px] text-[#8B9893] font-mono truncate">
                      ID: {entityInfo.id}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Impact Details Box */}
            {impactDetails.length > 0 && (
              <div className="p-3 rounded-lg bg-[#EDF1EF]/60 border border-[#DCE3DF] space-y-1.5 my-4">
                {impactDetails.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-[#5C6B66] leading-snug">
                    <Info size={13} className="text-[#E8532E] shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold bg-[#EDF1EF] hover:bg-[#DCE3DF] text-[#152131] border border-[#DCE3DF] transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${currentVariant.btnColor}`}
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{confirmText}</span>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmActionModal;
