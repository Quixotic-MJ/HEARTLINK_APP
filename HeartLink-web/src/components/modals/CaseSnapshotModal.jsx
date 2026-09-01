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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel - Centered */}
      <div className="relative w-full max-w-2xl bg-[#1A1A1A] max-h-full rounded-2xl shadow-2xl border border-white/10 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#161616] z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#36272B] flex items-center justify-center text-[#E55F37] border border-[#E55F37]/30 shrink-0">
              <Lock size={22} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2.5">
                Original Health Log Snapshot
                <span className="text-[9px] px-2.5 py-0.5 rounded-full border border-white/10 bg-white/5 text-slate-300 tracking-widest uppercase font-bold">
                  READ-ONLY RECORD
                </span>
              </h3>
              <p className="text-[10px] text-[#89899C] mt-1 font-mono flex items-center gap-1.5 font-medium">
                <Lock size={11} className="text-[#89899C]" /> {snapshotData.caseId} • Flagged:{" "}
                {snapshotData.flaggedDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Privacy Banner */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-start gap-3">
            <ShieldCheck size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.15em] mb-1">
                PRIVACY GUARDRAILS ACTIVE
              </p>
              <p className="text-xs text-emerald-300/90 leading-relaxed font-medium">
                All Personally Identifiable Information (PII) including names, contacts, and exact locations have been stripped. You are viewing strictly anonymized health and behavioral telemetry.
              </p>
            </div>
          </div>

          {/* Panel A (Patient Context) */}
          <div className="bg-[#21202E]/40 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-[#161616]">
              <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] flex items-center gap-2">
                <User size={13} className="text-[#E55F37]" /> Panel A: User Context
              </h4>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#161616] p-4 rounded-xl border border-white/10">
                  <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1.5">
                    BASELINE PROFILE
                  </p>
                  <p className="text-xs font-bold text-white">
                    {snapshotData.patientContext?.age} yrs • {snapshotData.patientContext?.sex}
                  </p>
                </div>
                <div className="bg-[#161616] p-4 rounded-xl border border-white/10">
                  <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-2">
                    REPORTED CONDITIONS
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {snapshotData.patientContext?.conditions?.map((cond, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-semibold text-slate-200 bg-[#21202E] border border-white/10 px-2.5 py-1 rounded-lg"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest mb-3">
                  Telemetry: System Output vs. User Action
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Algorithm Recommended */}
                  <div className="bg-[#161616] border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/10 bg-[#1A1A1A]">
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                        Algorithm Recommended
                      </p>
                    </div>
                    <div className="p-4 space-y-3 text-xs">
                      <div>
                        <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1">Target HSS Tier:</p>
                        <p className="font-bold text-white">{snapshotData.patientContext?.telemetry?.recommended?.targetTier}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1">Suggested Meal:</p>
                        <p className="font-medium text-slate-200">{snapshotData.patientContext?.telemetry?.recommended?.suggestedMeal}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1">Suggested Activity:</p>
                        <p className="font-medium text-slate-200">{snapshotData.patientContext?.telemetry?.recommended?.suggestedActivity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: User Actually Logged */}
                  <div className="bg-[#161616] border border-white/10 rounded-xl overflow-hidden">
                    <div className="px-4 py-2 border-b border-white/10 bg-[#1A1A1A] flex justify-between items-center">
                      <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                        User Actually Logged
                      </p>
                      {snapshotData.patientContext?.telemetry?.actual?.conflict && (
                        <AlertTriangle size={12} className="text-amber-400" />
                      )}
                    </div>
                    <div className="p-4 space-y-3 text-xs">
                      <div>
                        <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1 flex items-center gap-1">
                          Reported Vitals:
                        </p>
                        <p className="font-bold text-white">{snapshotData.patientContext?.telemetry?.actual?.vitals}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1">Logged Meal:</p>
                        <p className="font-medium text-slate-200">{snapshotData.patientContext?.telemetry?.actual?.loggedMeal}</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1">Logged Activity:</p>
                        <p className="font-medium text-slate-200">{snapshotData.patientContext?.telemetry?.actual?.loggedActivity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Panel B (Algorithmic Output) */}
          <div className="bg-[#21202E]/40 rounded-2xl border border-white/10 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/10 bg-[#161616]">
              <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] flex items-center gap-2">
                <Activity size={13} className="text-[#E55F37]" /> Panel B: Algorithmic Output
              </h4>
            </div>
            <div className="p-6 flex flex-col sm:flex-row gap-6 items-center">
              <div className="w-full sm:w-1/3 text-center sm:border-r border-white/10 pr-0 sm:pr-4">
                <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-2">
                  COMPUTED HSS
                </p>
                <p className="text-5xl font-black text-white mb-2">
                  {snapshotData.computedHss}
                </p>
              </div>
              <div className="w-full sm:w-2/3">
                <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-2">
                  SYSTEM ACTION TAKEN
                </p>
                <div className="text-xs font-medium text-slate-200 leading-relaxed bg-[#161616] p-4 rounded-xl border border-white/10">
                  {snapshotData.systemAction}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161616] flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseSnapshotModal;

