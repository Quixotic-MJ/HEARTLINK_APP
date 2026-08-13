import React from "react";
import {
  X,
  ShieldCheck,
  Lock,
  User,
  HeartPulse,
  Utensils,
  Activity,
  Download,
  AlertTriangle,
} from "lucide-react";

const CaseSnapshotModal = ({ isOpen, onClose, snapshotData }) => {
  if (!isOpen || !snapshotData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel - Centered */}
      <div className="relative w-full max-w-2xl bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden grayscale-[0.1]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 shrink-0">
              <Lock size={24} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2.5">
                Original Health Log Snapshot
                <span className="text-[9px] px-2.5 py-1 rounded-full border border-slate-200 bg-slate-100 text-slate-600 tracking-widest uppercase font-bold">
                  READ-ONLY RECORD
                </span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-1 font-mono flex items-center gap-1.5">
                <Lock size={12} className="text-slate-400" /> {snapshotData.caseId} • Flagged:{" "}
                {snapshotData.flaggedDate}
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
          {/* Privacy Banner */}
          <div className="bg-emerald-50/50 border border-emerald-100/60 p-4 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-600/70 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-emerald-800/80 uppercase tracking-[0.15em] mb-1">
                PRIVACY GUARDRAILS ACTIVE
              </p>
              <p className="text-[10px] text-emerald-700/70 leading-relaxed">
                All Personally Identifiable Information (PII) including names, contacts, and exact locations have been stripped. You are viewing strictly anonymized clinical and behavioral telemetry.
              </p>
            </div>
          </div>

          {/* Panel A (Patient Context) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden opacity-90">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <User size={13} /> Panel A: Patient Context
              </h4>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                    BASELINE PROFILE
                  </p>
                  <p className="text-xs font-semibold text-slate-700">
                    {snapshotData.patientContext?.age} yrs • {snapshotData.patientContext?.sex}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                    REPORTED CONDITIONS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {snapshotData.patientContext?.conditions?.map((cond, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                  Telemetry: System Output vs. User Action
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Algorithm Recommended */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-200/60 bg-slate-100/50">
                      <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                        Algorithm Recommended
                      </p>
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">Target HSS Tier:</p>
                        <p className="text-[11px] font-semibold text-slate-700">{snapshotData.patientContext?.telemetry?.recommended?.targetTier}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">Suggested Meal:</p>
                        <p className="text-[11px] font-medium text-slate-700">{snapshotData.patientContext?.telemetry?.recommended?.suggestedMeal}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1">Suggested Activity:</p>
                        <p className="text-[11px] font-medium text-slate-700">{snapshotData.patientContext?.telemetry?.recommended?.suggestedActivity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: User Actually Logged */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-200/60 bg-slate-100/50 flex justify-between items-center">
                      <p className="text-[9px] font-semibold text-slate-600 uppercase tracking-widest flex items-center gap-1.5">
                        User Actually Logged
                      </p>
                      {snapshotData.patientContext?.telemetry?.actual?.conflict && (
                        <AlertTriangle size={12} className="text-slate-400" />
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
                          Reported Vitals:
                        </p>
                        <p className="text-[11px] font-semibold text-slate-800">{snapshotData.patientContext?.telemetry?.actual?.vitals}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-1">Logged Meal:</p>
                        <p className="text-[11px] font-medium text-slate-700">{snapshotData.patientContext?.telemetry?.actual?.loggedMeal}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-medium text-slate-500 uppercase tracking-widest mb-1">Logged Activity:</p>
                        <p className="text-[11px] font-medium text-slate-700">{snapshotData.patientContext?.telemetry?.actual?.loggedActivity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel B (Algorithmic Output) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden opacity-90">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50">
              <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Activity size={13} /> Panel B: Algorithmic Output
              </h4>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-8 items-center">
              <div className="w-full sm:w-1/3 text-center sm:border-r border-slate-200 pr-0 sm:pr-4">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  COMPUTED HSS
                </p>
                <p className="text-5xl font-bold text-slate-700 mb-2">
                  {snapshotData.computedHss}
                </p>
              </div>
              <div className="w-full sm:w-2/3">
                <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  SYSTEM ACTION TAKEN
                </p>
                <div className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
                  {snapshotData.systemAction}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-[11px] font-medium text-slate-600 hover:bg-slate-200 bg-slate-100 border border-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
          <button
            className="flex items-center gap-2 px-5 py-2.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-300 rounded-xl transition-all hover:bg-slate-50 active:scale-[0.99] shadow-sm"
          >
            <Download size={14} /> Download Snapshot (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseSnapshotModal;
