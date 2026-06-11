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

const CalibrationDrawer = ({ isOpen, onClose, activeLog }) => {
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);

  if (!isOpen || !activeLog) return null;

  // Mock data for the snapshot modal
  const mockSnapshotData = activeLog ? {
    caseId: activeLog.caseId,
    flaggedDate: activeLog.timestamp,
    computedCss: 65,
    systemAction: "Triggered Precautionary Notification & suggested dietary recipe adjustment.",
    patientContext: {
      age: 45,
      sex: "Female",
      conditions: ["Hyperlipidemia", "Hypertension"],
      telemetry: {
        recommended: {
          targetTier: "Monitor Closely",
          suggestedMeal: "Low-Sodium Chicken Broth",
          suggestedActivity: "15-Minute Chair Yoga",
        },
        actual: {
          vitals: "BP 140/90, HR 88",
          loggedMeal: "High Sodium Instant Noodles",
          loggedActivity: "None",
          conflict: true,
        },
      },
    },
  } : null;

  // Star Rating Renderer
  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5" title={`${rating} out of 5 stars`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            size={12}
            className={
              i < rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-slate-100 text-slate-200"
            }
          />
        ))}
      </div>
    );
  };

  // Status Badge Renderer
  const getStatusBadge = (status) => {
    switch (status) {
      case "Applied to Algorithm":
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-[0.15em]">
            <CheckCircle2 size={12} /> APPLIED
          </span>
        );
      case "Archived":
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-[0.15em]">
            <Archive size={12} /> ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[9px] font-medium uppercase tracking-[0.15em]">
            <Clock size={12} /> LOGGED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel - Centered */}
      <div className="relative w-full max-w-md bg-white max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-900 border border-slate-100 shrink-0">
              <History size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 font-mono tracking-tight">
                {activeLog.feedbackId}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {activeLog.timestamp}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar space-y-8">
          {/* Status & Rating Banner */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                EXPERT RATING
              </p>
              {renderStars(activeLog.rating)}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1.5">
                STATUS
              </p>
              {getStatusBadge(activeLog.status)}
            </div>
          </div>

          {/* Reviewer Details */}
          <div>
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3">
              Reviewer Info
            </h4>
            <div className="flex items-center gap-3 bg-white border border-slate-100 p-3 rounded-xl shadow-sm">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <UserCircle size={18} />
              </div>
              <p className="text-[11px] font-semibold text-slate-900">
                {activeLog.reviewer}
              </p>
            </div>
          </div>

          {/* Linked Case Reference */}
          <div>
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3">
              Linked Reference
            </h4>
            <button
              onClick={() => setIsSnapshotOpen(true)}
              className="w-full text-left flex items-center justify-between p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 transition-colors group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText size={16} className="text-blue-600" />
                <div>
                  <p className="text-[11px] font-semibold text-blue-700 font-mono mb-0.5">
                    {activeLog.caseId}
                  </p>
                  <p className="text-[10px] text-blue-600/70 font-medium">
                    View original anonymized health logs
                  </p>
                </div>
              </div>
              <ExternalLink
                size={16}
                className="text-blue-600 opacity-40 group-hover:opacity-100 transition-opacity"
              />
            </button>
          </div>

          {/* Expert Notes Display (Read-Only) */}
          <div>
            <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3">
              Risk Interpretation Notes
            </h4>
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-xl shadow-inner">
              <p className="text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap italic font-medium">
                "{activeLog.notes}"
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-between items-center shrink-0">
          <button className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-red-600 transition-colors px-2 py-2 rounded-lg hover:bg-red-50">
            <Archive size={14} /> Archive Log
          </button>

          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 px-5 py-2.5 text-[11px] font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl shadow-sm transition-colors">
              <Download size={14} /> Export Record
            </button>
          </div>
        </div>
      </div>

      <CaseSnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        snapshotData={mockSnapshotData}
      />
    </div>
  );
};

export default CalibrationDrawer;
