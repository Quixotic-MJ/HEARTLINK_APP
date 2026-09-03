import React, { useState } from "react";
import {
  X,
  History,
  UserCircle,
  FileText,
  ExternalLink,
  Archive,
  CheckCircle2,
  Clock,
} from "lucide-react";
import CaseSnapshotModal from "./CaseSnapshotModal";

const CalibrationModal = ({ isOpen, onClose, activeLog, onArchive }) => {
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  if (!isOpen || !activeLog) return null;

  // Telemetry snapshot data for the snapshot modal
  const snapshotData = activeLog ? {
    caseId: activeLog.case_id,
    flaggedDate: activeLog.created_at ? new Date(activeLog.created_at).toLocaleString() : "",
    computedHss: activeLog.ml_predicted_hss,
    expertHss: activeLog.expert_hss_score,
    systemAction: `User classified as ${activeLog.ml_predicted_tier ? activeLog.ml_predicted_tier.toUpperCase() : "UNKNOWN"}. Calibration absolute error: ${activeLog.absolute_error != null ? activeLog.absolute_error : "N/A"}.`,
    patientContext: {
      age: activeLog.input_snapshot?.age || 45,
      sex: activeLog.input_snapshot?.sex || "Female",
      conditions: activeLog.input_snapshot?.diagnosed_conditions || ["Hyperlipidemia", "Hypertension"],
      telemetry: {
        recommended: {
          targetTier: activeLog.ml_predicted_tier || "Stable",
          suggestedMeal: "Low-Sodium Chicken Broth",
          suggestedActivity: "15-Minute Chair Yoga",
        },
        actual: {
          vitals: activeLog.input_snapshot?.resting_bp_mmhg ? `BP ${activeLog.input_snapshot.resting_bp_mmhg}, HR ${activeLog.input_snapshot.max_heart_rate_bpm}` : "BP 140/90, HR 88",
          loggedMeal: activeLog.input_snapshot?.salty_food_freq ? `Diet Salt Frequency: ${activeLog.input_snapshot.salty_food_freq}` : "High Sodium Instant Noodles",
          loggedActivity: activeLog.input_snapshot?.on_medication ? "On Meds: Yes" : "None",
          conflict: true,
        },
      },
    },
  } : null;

  // Status Badge Renderer
  const getStatusBadge = (status) => {
    switch (status) {
      case "Applied to Algorithm":
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] px-2.5 py-0.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider">
            <CheckCircle2 size={12} /> APPLIED
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF] px-2.5 py-0.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider">
            <Archive size={12} /> ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD] px-2.5 py-0.5 rounded-full text-[9.5px] font-semibold uppercase tracking-wider">
            <Clock size={12} /> LOGGED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Panel - Centered */}
      <div className="relative w-full max-w-lg bg-[#FFFFFF] max-h-full rounded-2xl shadow-2xl border border-[#DCE3DF] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-[#152131]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#DCE3DF] bg-[#FFFFFF] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#FBEAE6] flex items-center justify-center text-[#E8532E] border border-[#DCE3DF] shrink-0">
              <History size={18} />
            </div>
            <div>
              <h3 
                className="text-[17px] font-medium text-[#152131] tracking-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {activeLog.id}
              </h3>
              <p className="text-[11px] text-[#8B9893] mt-0.5 font-medium">
                {activeLog.created_at ? new Date(activeLog.created_at).toLocaleString() : ""}
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
        <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-5">
          {/* Status & Rating Banner */}
          <div className="flex flex-col gap-3.5 bg-[#EDF1EF]/60 p-4 rounded-[10px] border border-[#DCE3DF]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                  Expert HSS vs Model HSS
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span 
                    className="text-2xl font-bold text-[#1B6E63]"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {activeLog.expert_hss_score}
                  </span>
                  <span className="text-[11px] text-[#1B6E63] font-semibold uppercase">({activeLog.expert_hss_tier || "Stable"})</span>
                  <span className="text-[#8B9893] mx-1">/</span>
                  <span 
                    className="text-lg font-bold text-[#152131]"
                    style={{ fontFamily: "'Fraunces', serif" }}
                  >
                    {activeLog.ml_predicted_hss ?? "--"}
                  </span>
                  <span className="text-[11px] text-[#5C6B66] font-semibold uppercase">({activeLog.ml_predicted_tier || "Stable"})</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                  Status
                </p>
                {getStatusBadge(activeLog.status)}
              </div>
            </div>

            {/* Derived Calibration Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-[#DCE3DF] text-[12px]">
              <div>
                <span className="text-[#89899C] uppercase font-semibold text-[10px]">Absolute Error:</span>
                <span className="ml-1.5 text-[#152131] font-bold">{activeLog.absolute_error != null ? `${activeLog.absolute_error} pts` : "N/A"}</span>
              </div>
              <div className="text-right">
                <span className="text-[#89899C] uppercase font-semibold text-[10px]">Tier Agreement:</span>
                <span className={`ml-1.5 font-bold ${activeLog.tier_agreement ? "text-[#1B6E63]" : "text-[#A9741B]"}`}>
                  {activeLog.tier_agreement ? "AGREE" : "DISAGREE"}
                </span>
              </div>
            </div>

            {/* Model Metadata */}
            {activeLog.model_metadata && (
              <div className="pt-2 border-t border-[#DCE3DF] text-[11px] text-[#8B9893] font-mono flex flex-col gap-0.5">
                <div>Model: <span className="text-[#152131] font-medium">{activeLog.model_metadata.model_identifier}</span></div>
                {activeLog.model_metadata.model_hash && <div className="truncate">Hash: <span className="text-[#152131] font-medium">{activeLog.model_metadata.model_hash.substring(0, 16)}…</span></div>}
              </div>
            )}
          </div>

          {/* Reviewer Details */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1.5 mb-2.5">
              Reviewer info
            </h4>
            <div className="flex items-center gap-2.5 bg-[#FFFFFF] border border-[#DCE3DF] p-3 rounded-[8px]">
              <div className="w-7 h-7 rounded-full bg-[#EDF1EF] flex items-center justify-center text-[#5C6B66] shrink-0">
                <UserCircle size={16} />
              </div>
              <p className="text-[12.5px] font-semibold text-[#152131]">
                {activeLog.reviewer_name || "Unknown Reviewer"}
              </p>
            </div>
          </div>

          {/* Linked Case Reference */}
          <div>
            <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1.5 mb-2.5">
              Linked reference
            </h4>
            <button
              onClick={() => setIsSnapshotOpen(true)}
              className="w-full text-left flex items-center justify-between p-3 rounded-[8px] border border-[#DCE3DF] bg-[#FFFFFF] hover:border-[#E8532E] hover:bg-[#EDF1EF]/40 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[6px] bg-[#FBEAE6] flex items-center justify-center text-[#E8532E]">
                  <FileText size={14} />
                </div>
                <div>
                  <p className="text-[12.5px] font-bold text-[#152131] font-mono leading-tight">
                    {activeLog.case_id}
                  </p>
                  <p className="text-[11px] text-[#5C6B66] font-medium mt-0.5">
                    View original anonymized health logs
                  </p>
                </div>
              </div>
              <ExternalLink
                size={14}
                className="text-[#E8532E] opacity-70 group-hover:opacity-100 transition-opacity"
              />
            </button>
          </div>

          {/* Structured Calibration Metrics */}
          <div className="space-y-3.5 pt-2 border-t border-[#DCE3DF] text-[12px]">
            <div>
              <span className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-1">Reviewer confidence</span>
              <span className={`inline-flex items-center text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                activeLog.reviewer_confidence === "high"
                  ? "bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8]"
                  : activeLog.reviewer_confidence === "medium"
                  ? "bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8]"
                  : activeLog.reviewer_confidence === "low"
                  ? "bg-[#F7E4E1] text-[#A93226] border border-[#F0C4B8]"
                  : "bg-[#EDF1EF] text-[#5C6B66] border border-[#DCE3DF]"
              }`}>
                {activeLog.reviewer_confidence ? activeLog.reviewer_confidence : "Not recorded"}
              </span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-1">Adjustment reasons</span>
              <div className="flex flex-wrap gap-1.5">
                {activeLog.adjustment_reasons && activeLog.adjustment_reasons.length > 0 ? (
                  activeLog.adjustment_reasons.map((code) => {
                    const labelMap = {
                      blood_pressure_pattern: "Blood pressure pattern",
                      heart_rate_pattern: "Heart-rate pattern",
                      symptoms: "Symptoms",
                      medication_related_factor: "Medication-related factor",
                      activity_pattern: "Activity pattern",
                      nutrition_sodium_pattern: "Nutrition / sodium pattern",
                      sleep_pattern: "Sleep pattern",
                      baseline_information: "Baseline information",
                      other: "Other",
                      model_consistent: "Model assessment appears consistent",
                    };
                    return (
                      <span key={code} className="text-[11px] font-medium text-[#152131] bg-[#EDF1EF] border border-[#DCE3DF] px-2 py-0.5 rounded-[5px]">
                        {labelMap[code] || code}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[11px] text-[#8B9893] italic">Not recorded</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#FFFFFF] p-2.5 rounded-[8px] border border-[#DCE3DF]">
                <span className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-0.5">Exercise Suitability</span>
                <span className="text-[12px] font-bold text-[#152131] capitalize">
                  {activeLog.exercise_feedback?.status 
                    ? (activeLog.exercise_feedback.status === "appropriate" ? "Appropriate" : "Needs Review")
                    : "Not recorded"}
                </span>
                {activeLog.exercise_feedback?.notes && (
                  <p className="text-[10.5px] text-[#5C6B66] italic mt-0.5 leading-snug">"{activeLog.exercise_feedback.notes}"</p>
                )}
              </div>
              <div className="bg-[#FFFFFF] p-2.5 rounded-[8px] border border-[#DCE3DF]">
                <span className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider block mb-0.5">Recipe Suitability</span>
                <span className="text-[12px] font-bold text-[#152131] capitalize">
                  {activeLog.recipe_feedback?.status 
                    ? (activeLog.recipe_feedback.status === "appropriate" ? "Appropriate" : "Needs Review")
                    : "Not recorded"}
                </span>
                {activeLog.recipe_feedback?.notes && (
                  <p className="text-[10.5px] text-[#5C6B66] italic mt-0.5 leading-snug">"{activeLog.recipe_feedback.notes}"</p>
                )}
              </div>
            </div>
          </div>

          {/* Expert Notes Display (Read-Only) */}
          <div className="space-y-3 pt-2 border-t border-[#DCE3DF]">
            <div>
              <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1.5 mb-2">
                Risk interpretation notes
              </h4>
              <div className="bg-[#EDF1EF]/60 border border-[#DCE3DF] p-3 rounded-[8px]">
                <p className="text-[12px] text-[#152131] leading-relaxed whitespace-pre-wrap italic font-medium">
                  {activeLog.notes ? `"${activeLog.notes}"` : "No interpretation notes provided."}
                </p>
              </div>
            </div>

            {activeLog.recommendation_feedback && (
              <div>
                <h4 className="text-[11px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1.5 mb-2">
                  Prescription feedback
                </h4>
                <div className="bg-[#EDF1EF]/60 border border-[#DCE3DF] p-3 rounded-[8px]">
                  <p className="text-[12px] text-[#152131] leading-relaxed whitespace-pre-wrap italic font-medium">
                    "{activeLog.recommendation_feedback}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex justify-between items-center shrink-0">
          <button 
            onClick={() => onArchive && onArchive(activeLog.id)}
            disabled={activeLog.status === "Archived"}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#5C6B66] hover:text-[#A93226] transition-colors px-3 py-1.5 rounded-[6px] hover:bg-[#F7E4E1] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Archive size={14} /> <span>{activeLog.status === "Archived" ? "Archived" : "Archive log"}</span>
          </button>

          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      <CaseSnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        snapshotData={snapshotData}
      />
    </div>
  );
};

export default CalibrationModal;
