import React from "react";
import {
  X,
  AlertTriangle,
  HeartPulse,
  Utensils,
  WifiOff,
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
  Stethoscope,
  Activity,
  FileText,
} from "lucide-react";

const AlertTriageModal = ({ isOpen, onClose, activeAlert, userRole }) => {
  if (!isOpen || !activeAlert) return null;

  const getSeverityStyles = (severity) => {
    if (severity === "Critical") return "bg-red-50 text-red-600 border-red-100";
    if (severity === "Warning")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-slate-50 text-slate-700 border-slate-100";
  };

  const getSeverityIconColor = (severity) => {
    if (severity === "Critical") return "bg-red-50 text-red-600 border-red-100";
    if (severity === "Warning")
      return "bg-amber-50 text-amber-600 border-amber-100";
    return "bg-blue-50 text-blue-600 border-blue-100";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel - Centered */}
      <div className="relative w-full max-w-2xl bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${getSeverityIconColor(
                activeAlert.severity
              )}`}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 font-mono">
                {activeAlert.alertId}
                <span
                  className={`text-[9px] px-2.5 py-1 rounded-full border tracking-widest uppercase font-bold ${getSeverityStyles(
                    activeAlert.severity
                  )}`}
                >
                  {activeAlert.severity}
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 font-medium flex items-center gap-1.5">
                <Clock size={12} /> {activeAlert.timestamp}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Status Banner */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                TRIAGE STATUS
              </p>
              <p
                className={`text-xs font-semibold ${
                  activeAlert.status === "Resolved"
                    ? "text-emerald-600"
                    : activeAlert.status === "Escalated"
                      ? "text-red-600"
                      : "text-blue-600"
                }`}
              >
                {activeAlert.status.toUpperCase()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                AFFECTED ENTITY
              </p>
              <a
                href={`/users/${activeAlert.userId}`}
                className="text-xs font-semibold text-slate-900 font-mono hover:text-blue-600 flex items-center justify-end gap-1 transition-colors"
              >
                {activeAlert.userId} <ArrowRight size={12} />
              </a>
            </div>
          </div>

          {/* Alert Context Display: The Trigger Event */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={13} /> THE TRIGGER EVENT
              </h4>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  ALERT MESSAGE
                </p>
                <p className="text-xs font-medium text-slate-900 leading-relaxed">
                  {activeAlert.message}
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <FileText size={12} /> SOURCE LOG:{" "}
                  <span className="font-mono text-slate-700">
                    {activeAlert.triggerContext.logId}
                  </span>
                </p>
                <p className="text-[11px] text-slate-800 leading-relaxed font-mono bg-white p-3 rounded-lg border border-slate-200 mt-2 shadow-sm">
                  {activeAlert.triggerContext.data}
                </p>
              </div>
            </div>
          </div>

          {/* System Action Taken */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-semibold text-slate-600 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={13} /> SYSTEM ACTION TAKEN
              </h4>
            </div>
            <div className="p-5">
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 shadow-inner">
                <p className="text-xs font-medium text-slate-800 leading-relaxed">
                  {activeAlert.systemAction}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Role-Dependent Actions */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 shrink-0">
          {userRole === "sysadmin" ? (
            /* System Admin Controls */
            <div className="flex flex-col gap-3">
              <button className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-colors shadow-sm">
                <ShieldAlert size={14} /> Escalate to Medical Expert
              </button>
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-medium text-slate-600 bg-white hover:bg-slate-50 border border-transparent rounded-xl transition-colors">
                  Acknowledge Alert
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99] shadow-sm" style={{ backgroundColor: "#0f172a" }}>
                  <CheckCircle2 size={14} /> Mark as Resolved
                </button>
              </div>
            </div>
          ) : (
            /* Medical Expert Controls */
            <div className="flex flex-col gap-3">
              <button className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-semibold text-red-600 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-colors shadow-sm">
                <Stethoscope size={14} /> Trigger Emergency Check-up Suggestion
              </button>
              <button className="w-full flex items-center justify-center gap-2 px-5 py-2.5 text-[11px] font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99] shadow-sm" style={{ backgroundColor: "#0f172a" }}>
                <CheckCircle2 size={14} /> Mark as Clinically Resolved
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertTriageModal;
