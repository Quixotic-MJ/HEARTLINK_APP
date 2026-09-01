import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  X,
  Loader2,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Info,
} from "lucide-react";

const VARIANTS = {
  danger: {
    iconBg: "bg-rose-500/10 border-rose-500/25 text-rose-400 shadow-rose-500/10",
    pingBg: "bg-rose-500/15",
    accentBar: "bg-gradient-to-r from-rose-500 via-[#E55F37] to-amber-500",
    btnColor: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/25",
  },
  warning: {
    iconBg: "bg-amber-500/10 border-amber-500/25 text-amber-400 shadow-amber-500/10",
    pingBg: "bg-amber-500/15",
    accentBar: "bg-gradient-to-r from-amber-500 via-[#E55F37] to-indigo-500",
    btnColor: "bg-[#E55F37] hover:bg-[#D4542E] text-white shadow-[#E55F37]/25",
  },
  primary: {
    iconBg: "bg-indigo-500/10 border-indigo-500/25 text-indigo-400 shadow-indigo-500/10",
    pingBg: "bg-indigo-500/15",
    accentBar: "bg-gradient-to-r from-indigo-500 via-[#E55F37] to-purple-500",
    btnColor: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25",
  },
  success: {
    iconBg: "bg-emerald-500/10 border-emerald-500/25 text-emerald-400 shadow-emerald-500/10",
    pingBg: "bg-emerald-500/15",
    accentBar: "bg-gradient-to-r from-emerald-500 via-teal-500 to-[#E55F37]",
    btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25",
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
          className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          onClick={!loading ? onClose : undefined}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-md bg-[#1A1A1A] rounded-3xl shadow-2xl border border-white/10 overflow-hidden text-white z-10"
        >
          {/* Top glowing line */}
          <div className={`h-1 w-full ${currentVariant.accentBar}`} />

          {/* Close button */}
          <button
            onClick={onClose}
            disabled={loading}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer disabled:opacity-40"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>

          <div className="p-6 sm:p-7">
            {/* Action Icon */}
            <div
              className={`relative w-14 h-14 rounded-2xl border flex items-center justify-center mx-auto mb-4 shadow-lg ${currentVariant.iconBg}`}
            >
              <div
                className={`absolute inset-0 rounded-2xl animate-ping opacity-30 pointer-events-none ${currentVariant.pingBg}`}
              />
              <IconComponent size={24} className="relative z-10" />
            </div>

            {/* Title & Subtitle */}
            <div className="text-center">
              <h3 className="text-lg font-bold text-white tracking-tight">
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] text-[#E55F37] font-semibold mt-0.5 uppercase tracking-wider">
                  {subtitle}
                </p>
              )}
              {description && (
                <p className="text-xs text-[#89899C] mt-2 leading-relaxed max-w-sm mx-auto">
                  {description}
                </p>
              )}
            </div>

            {/* Target Entity Card */}
            {entityInfo && (
              <div className="p-3.5 rounded-2xl bg-[#161616] border border-white/5 flex items-center gap-3.5 my-4 text-left">
                {entityInfo.avatar ? (
                  entityInfo.avatar
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-[#21202E] text-white border border-white/10 flex items-center justify-center font-extrabold text-sm shrink-0">
                    {(entityInfo.name || "U").substring(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold text-white truncate">
                      {entityInfo.name}
                    </p>
                    {entityInfo.badge && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-white/10 bg-white/5 text-slate-300">
                        {entityInfo.badge}
                      </span>
                    )}
                  </div>
                  {entityInfo.email && (
                    <p className="text-[10px] text-[#89899C] font-mono truncate mt-0.5">
                      {entityInfo.email}
                    </p>
                  )}
                  {entityInfo.id && (
                    <p className="text-[9px] text-slate-500 font-mono truncate">
                      ID: {entityInfo.id}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Impact Details Box */}
            {impactDetails.length > 0 && (
              <div className="p-3 rounded-xl bg-[#21202E]/40 border border-white/5 space-y-1.5 my-4">
                {impactDetails.map((detail, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11px] text-[#89899C] leading-snug">
                    <Info size={13} className="text-[#E55F37] shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-[#21202E] hover:bg-[#2A2938] text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 ${currentVariant.btnColor}`}
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
