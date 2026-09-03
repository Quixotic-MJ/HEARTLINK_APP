import React from "react";
import {
  X,
  ShieldCheck,
  Lock,
  User,
  AlertTriangle,
} from "lucide-react";

const CaseSnapshotModal = ({ isOpen, onClose, snapshotData }) => {
  if (!isOpen || !snapshotData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Panel - Centered */}
      <div className="relative w-full max-w-2xl bg-[#FFFFFF] max-h-full rounded-2xl shadow-2xl border border-[#DCE3DF] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-[#152131]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#DCE3DF] bg-[#FFFFFF] z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-[8px] bg-[#FBEAE6] flex items-center justify-center text-[#E8532E] border border-[#DCE3DF] shrink-0">
              <Lock size={18} />
            </div>
            <div>
              <h3 
                className="text-[17px] font-medium text-[#152131] flex items-center gap-2 tracking-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Original Health Log Snapshot
                <span className="text-[9.5px] px-2 py-0.5 rounded-full border border-[#DCE3DF] bg-[#EDF1EF] text-[#5C6B66] tracking-wider uppercase font-semibold">
                  READ-ONLY
                </span>
              </h3>
              <p className="text-[11px] text-[#8B9893] mt-0.5 font-mono flex items-center gap-1 font-medium">
                <Lock size={11} className="text-[#8B9893]" /> {snapshotData.caseId} • Flagged:{" "}
                {snapshotData.flaggedDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5C6B66] hover:text-[#152131] p-1.5 rounded-lg hover:bg-[#EDF1EF] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-5">
          {/* Privacy Banner */}
          <div className="bg-[#E3EFEC] border border-[#C5DFD8] p-3.5 rounded-[8px] flex items-start gap-2.5">
            <ShieldCheck size={16} className="text-[#1B6E63] shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-[#1B6E63] uppercase tracking-wider mb-0.5">
                PRIVACY GUARDRAILS ACTIVE
              </p>
              <p className="text-[11.5px] text-[#1B6E63] leading-relaxed font-medium">
                All Personally Identifiable Information (PII) including names, contacts, and exact locations have been stripped. You are viewing strictly anonymized health and behavioral telemetry.
              </p>
            </div>
          </div>

          {/* Panel A (Patient Context) */}
          <div className="bg-[#EDF1EF]/50 rounded-[10px] border border-[#DCE3DF] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[#DCE3DF] bg-[#FFFFFF]">
              <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider flex items-center gap-1.5">
                <User size={12} className="text-[#E8532E]" /> User Context
              </h4>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF]">
                  <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                    BASELINE PROFILE
                  </p>
                  <p className="text-[13px] font-bold text-[#152131]">
                    {snapshotData.patientContext?.age} yrs • {snapshotData.patientContext?.sex}
                  </p>
                </div>
                <div className="bg-[#FFFFFF] p-3 rounded-[8px] border border-[#DCE3DF]">
                  <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                    REPORTED CONDITIONS
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {snapshotData.patientContext?.conditions?.map((cond, i) => (
                      <span
                        key={i}
                        className="text-[10.5px] font-medium text-[#152131] bg-[#EDF1EF] border border-[#DCE3DF] px-2 py-0.5 rounded-[5px]"
                      >
                        {cond}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[#DCE3DF]">
                <p className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider mb-2.5">
                  Telemetry: System output vs. user action
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Left Column: Algorithm Recommended */}
                  <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-[#DCE3DF] bg-[#EDF1EF]/40">
                      <p className="text-[10px] font-semibold text-[#5C6B66] uppercase tracking-wider">
                        Algorithm Recommended
                      </p>
                    </div>
                    <div className="p-3 space-y-2 text-[12px]">
                      <div>
                        <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">Target HSS Tier:</p>
                        <p className="font-bold text-[#152131]">{snapshotData.patientContext?.telemetry?.recommended?.targetTier}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">Suggested Meal:</p>
                        <p className="font-medium text-[#5C6B66]">{snapshotData.patientContext?.telemetry?.recommended?.suggestedMeal}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">Suggested Activity:</p>
                        <p className="font-medium text-[#5C6B66]">{snapshotData.patientContext?.telemetry?.recommended?.suggestedActivity}</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: User Actually Logged */}
                  <div className="bg-[#FFFFFF] border border-[#DCE3DF] rounded-[8px] overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-[#DCE3DF] bg-[#EDF1EF]/40 flex justify-between items-center">
                      <p className="text-[10px] font-semibold text-[#5C6B66] uppercase tracking-wider">
                        User Actually Logged
                      </p>
                      {snapshotData.patientContext?.telemetry?.actual?.conflict && (
                        <AlertTriangle size={12} className="text-[#A9741B]" />
                      )}
                    </div>
                    <div className="p-3 space-y-2 text-[12px]">
                      <div>
                        <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">
                          Reported Vitals:
                        </p>
                        <p className="font-bold text-[#152131]">{snapshotData.patientContext?.telemetry?.actual?.vitals}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">Logged Meal:</p>
                        <p className="font-medium text-[#5C6B66]">{snapshotData.patientContext?.telemetry?.actual?.loggedMeal}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">Logged Activity:</p>
                        <p className="font-medium text-[#5C6B66]">{snapshotData.patientContext?.telemetry?.actual?.loggedActivity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaseSnapshotModal;
