import React from "react";
import { X, CheckCircle2, Megaphone, Info, ShieldAlert, Wrench } from "lucide-react";

const ViewBroadcastModal = ({ isOpen, onClose, broadcast, onDelete }) => {
  if (!isOpen || !broadcast) return null;

  const getCategoryBadge = (category) => {
    switch (category) {
      case "Maintenance":
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <Wrench size={10} /> Maintenance
          </span>
        );
      case "App Update":
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <Info size={10} /> Update
          </span>
        );
      case "Safety Reminder":
        return (
          <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <ShieldAlert size={10} /> Safety
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <Megaphone size={10} /> General
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-bold text-slate-900">Broadcast Details</h3>
            {getCategoryBadge(broadcast.type)}
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Meta Info Card */}
          <div className="bg-slate-100/50 p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Published On</span>
              <span className="text-xs font-bold text-slate-900">{broadcast.date}</span>
            </div>
            <div className="h-px w-full bg-slate-200"></div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Published By</span>
              <span className="text-xs font-semibold text-slate-700">{broadcast.publisher}</span>
            </div>
          </div>

          {/* Message Body */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3">
              Broadcast Message
            </h4>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                {broadcast.message}
              </p>
            </div>
          </div>

          {/* Metrics Block */}
          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700">Delivery Status: Success</span>
            </div>
            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md">
              Pushed to all devices
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-slate-200 bg-white flex justify-between shrink-0 items-center">
          <button 
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this broadcast? This will remove it from the history and stop it from showing on mobile devices.")) {
                onDelete(broadcast.id);
              }
            }}
            className="px-4 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-colors border border-red-100 shadow-sm flex items-center gap-2"
          >
            <ShieldAlert size={14} /> Delete
          </button>
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewBroadcastModal;
