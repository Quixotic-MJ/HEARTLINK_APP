import React, { useState } from "react";
import { X, CheckCircle2, Megaphone, Info, ShieldAlert, Wrench, AlertTriangle } from "lucide-react";

export const getCategoryBadge = (category) => {
  switch (category) {
    case "Maintenance":
      return (
        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
          <Wrench size={10} /> Maintenance
        </span>
      );
    case "App Update":
      return (
        <span className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
          <Info size={10} /> Update
        </span>
      );
    case "Safety Reminder":
      return (
        <span className="inline-flex items-center gap-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
          <ShieldAlert size={10} /> Safety
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 bg-white/5 text-slate-300 border border-white/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
          <Megaphone size={10} /> General
        </span>
      );
  }
};

const ViewBroadcastModal = ({ isOpen, onClose, broadcast, onDelete }) => {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  if (!isOpen || !broadcast) return null;

  const handleConfirmDelete = () => {
    setIsDeleteConfirmOpen(false);
    onDelete(broadcast.id);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer" 
          onClick={onClose}
        ></div>
        <div className="relative w-full max-w-md bg-[#1A1A1A] max-h-full rounded-2xl shadow-2xl border border-white/10 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-white">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#161616] z-10">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-bold text-white">Announcement Details</h3>
              {getCategoryBadge(broadcast.type)}
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 space-y-5 overflow-y-auto custom-scrollbar">
            {/* Title */}
            {(broadcast.title || broadcast.type) && (
              <div>
                <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-3">
                  Announcement Title
                </h4>
                <p className="text-sm font-bold text-white">
                  {broadcast.title || broadcast.type}
                </p>
              </div>
            )}

            {/* Meta Info Card */}
            <div className="bg-[#21202E]/40 p-4 rounded-xl border border-white/10 flex flex-col gap-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest">Published On</span>
                <span className="text-xs font-mono font-bold text-white">{broadcast.date}</span>
              </div>
              <div className="h-px w-full bg-white/5"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest">Published By</span>
                <span className="text-xs font-semibold text-slate-300">
                  {broadcast.display_publisher ||
                    (broadcast.publisher
                      ? broadcast.publisher.replace(/^[^(]+\((.+)\)$/, "$1")
                      : "System Admin")}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-3">
                Announcement Message
              </h4>
              <div className="bg-[#161616] rounded-xl border border-white/10 p-5">
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                  {broadcast.message}
                </p>
              </div>
            </div>

            {/* Recipient count (if returned by API) */}
            {typeof broadcast.recipients_count === "number" ? (
              <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400">Delivered</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {broadcast.recipients_count} recipient{broadcast.recipients_count !== 1 ? "s" : ""}
                </span>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-white/10 bg-[#161616] flex justify-between shrink-0 items-center">
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-4 py-2 text-xs font-bold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 rounded-xl transition-colors border border-rose-500/20 shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <ShieldAlert size={14} /> Delete
            </button>
            <button 
              onClick={onClose} 
              className="px-6 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 hover:border-white/20 rounded-xl transition-colors shadow-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer" 
            onClick={() => setIsDeleteConfirmOpen(false)}
          ></div>
          <div className="bg-[#1A1A1A] p-6 rounded-2xl shadow-2xl max-w-sm w-full relative animate-in fade-in zoom-in-95 duration-200 border border-white/10 text-white">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20 text-rose-400">
              <AlertTriangle size={22} />
            </div>
            <h3 className="text-sm font-bold text-white mb-2">Delete this announcement?</h3>
            <p className="text-xs text-[#89899C] mb-6 leading-relaxed">
              This announcement will be permanently removed and its associated notification records will also be deleted.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)} 
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldAlert size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewBroadcastModal;


