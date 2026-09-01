import React, { useState } from "react";
import {
  X,
  History,
  Star,
  UserCircle,
  FileText,
  ExternalLink,
  Archive,
  Download,
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
          <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.15em]">
            <CheckCircle2 size={12} /> APPLIED
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-400 border border-white/10 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.15em]">
            <Archive size={12} /> ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.15em]">
            <Clock size={12} /> LOGGED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel - Centered */}
      <div className="relative w-full max-w-lg bg-[#1A1A1A] max-h-full rounded-2xl shadow-2xl border border-white/10 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-white">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#161616] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#36272B] flex items-center justify-center text-[#E55F37] border border-[#E55F37]/30 shrink-0">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-mono tracking-tight">
                {activeLog.id}
              </h3>
              <p className="text-[10px] text-[#89899C] mt-0.5 font-medium">
                {activeLog.created_at ? new Date(activeLog.created_at).toLocaleString() : ""}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-6">
          {/* Status & Rating Banner */}
          <div className="flex flex-col gap-4 bg-[#21202E]/50 p-4 rounded-xl border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1">
                  EXPERT HSS vs MODEL HSS
                </p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-emerald-400">{activeLog.expert_hss_score}</span>
                  <span className="text-[10px] text-emerald-400/80 font-bold uppercase">{activeLog.expert_hss_tier || "Stable"}</span>
                  <span className="text-slate-500">/</span>
                  <span className="text-base font-bold text-white">{activeLog.ml_predicted_hss ?? "--"}</span>
                  <span className="text-[10px] text-[#89899C] font-bold uppercase">{activeLog.ml_predicted_tier || "Stable"}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-[#89899C] uppercase tracking-widest mb-1">
                  STATUS
                </p>
                {getStatusBadge(activeLog.status)}
              </div>
            </div>

            {/* Derived Calibration Metrics */}
            <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-white/10 text-xs">
              <div>
                <span className="text-[#89899C] uppercase font-bold text-[10px]">Absolute Error:</span>
                <span className="ml-1.5 text-white font-bold">{activeLog.absolute_error != null ? `${activeLog.absolute_error} pts` : "N/A"}</span>
              </div>
              <div className="text-right">
                <span className="text-[#89899C] uppercase font-bold text-[10px]">Tier Agreement:</span>
                <span className={`ml-1.5 font-bold ${activeLog.tier_agreement ? "text-emerald-400" : "text-amber-400"}`}>
                  {activeLog.tier_agreement ? "AGREE" : "DISAGREE"}
                </span>
              </div>
            </div>

            {/* Model Metadata */}
            {activeLog.model_metadata && (
              <div className="pt-2 border-t border-white/10 text-[10px] text-[#89899C] font-mono flex flex-col gap-0.5">
                <div>Model: <span className="text-slate-300">{activeLog.model_metadata.model_identifier}</span></div>
                {activeLog.model_metadata.model_hash && <div className="truncate">Hash: <span className="text-slate-300">{activeLog.model_metadata.model_hash.substring(0, 16)}...</span></div>}
              </div>
            )}
          </div>

          {/* Reviewer Details */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10 pb-2 mb-3">
              Reviewer Info
            </h4>
            <div className="flex items-center gap-3 bg-[#161616] border border-white/10 p-3 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[#21202E] flex items-center justify-center text-slate-300 shrink-0">
                <UserCircle size={18} />
              </div>
              <p className="text-xs font-bold text-white">
                {activeLog.reviewer_name || "Unknown Reviewer"}
              </p>
            </div>
          </div>

          {/* Linked Case Reference */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10 pb-2 mb-3">
              Linked Reference
            </h4>
            <button
              onClick={() => setIsSnapshotOpen(true)}
              className="w-full text-left flex items-center justify-between p-3.5 rounded-xl border border-white/10 bg-[#161616] hover:border-[#E55F37]/40 hover:bg-[#21202E]/40 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#36272B] flex items-center justify-center text-[#E55F37]">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white font-mono mb-0.5">
                    {activeLog.case_id}
                  </p>
                  <p className="text-[10px] text-[#89899C] font-medium">
                    View original anonymized health logs
                  </p>
                </div>
              </div>
              <ExternalLink
                size={16}
                className="text-[#E55F37] opacity-60 group-hover:opacity-100 transition-opacity"
              />
            </button>
          </div>

          {/* Structured Calibration Metrics */}
          <div className="space-y-4 pt-3 border-t border-white/10 text-xs">
            <div>
              <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] block mb-1.5">Reviewer Confidence</span>
              <span className={`inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                activeLog.reviewer_confidence === "high"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : activeLog.reviewer_confidence === "medium"
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  : activeLog.reviewer_confidence === "low"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-white/5 text-slate-400 border border-white/10"
              }`}>
                {activeLog.reviewer_confidence ? activeLog.reviewer_confidence : "Not recorded"}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] block mb-1.5">Adjustment Reasons</span>
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
                      <span key={code} className="text-[10px] font-medium text-slate-200 bg-[#21202E] border border-white/10 px-2 py-0.5 rounded-md">
                        {labelMap[code] || code}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-[10px] text-slate-500 italic">Not recorded</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#161616] p-3 rounded-xl border border-white/10">
                <span className="text-[9px] font-bold text-[#89899C] uppercase tracking-wider block mb-1">Exercise Suitability</span>
                <span className="text-xs font-bold text-white capitalize">
                  {activeLog.exercise_feedback?.status 
                    ? (activeLog.exercise_feedback.status === "appropriate" ? "Appropriate" : "Needs Review")
                    : "Not recorded"}
                </span>
                {activeLog.exercise_feedback?.notes && (
                  <p className="text-[10px] text-slate-400 italic mt-1 leading-snug">"{activeLog.exercise_feedback.notes}"</p>
                )}
              </div>
              <div className="bg-[#161616] p-3 rounded-xl border border-white/10">
                <span className="text-[9px] font-bold text-[#89899C] uppercase tracking-wider block mb-1">Recipe Suitability</span>
                <span className="text-xs font-bold text-white capitalize">
                  {activeLog.recipe_feedback?.status 
                    ? (activeLog.recipe_feedback.status === "appropriate" ? "Appropriate" : "Needs Review")
                    : "Not recorded"}
                </span>
                {activeLog.recipe_feedback?.notes && (
                  <p className="text-[10px] text-slate-400 italic mt-1 leading-snug">"{activeLog.recipe_feedback.notes}"</p>
                )}
              </div>
            </div>
          </div>

          {/* Expert Notes Display (Read-Only) */}
          <div className="space-y-4 pt-3 border-t border-white/10">
            <div>
              <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10 pb-2 mb-3">
                Risk Interpretation Notes
              </h4>
              <div className="bg-[#161616] border border-white/10 p-4 rounded-xl">
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap italic font-medium">
                  {activeLog.notes ? `"${activeLog.notes}"` : "No interpretation notes provided."}
                </p>
              </div>
            </div>

            {activeLog.recommendation_feedback && (
              <div>
                <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] border-b border-white/10 pb-2 mb-3">
                  Prescription Feedback
                </h4>
                <div className="bg-[#161616] border border-white/10 p-4 rounded-xl">
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap italic font-medium">
                    "{activeLog.recommendation_feedback}"
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#161616] flex justify-between items-center shrink-0">
          <button 
            onClick={() => onArchive && onArchive(activeLog.id)}
            disabled={activeLog.status === "Archived"}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors px-3 py-2 rounded-xl hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Archive size={14} /> {activeLog.status === "Archived" ? "Archived" : "Archive Log"}
          </button>

          <div className="flex gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
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

