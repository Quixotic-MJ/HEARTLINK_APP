import React, { useState, useEffect } from "react";
import {
  X,
  MessageSquare,
  Bug,
  Lightbulb,
  UserCircle,
  HelpCircle,
  Smartphone,
  Save,
  Archive,
  Clock,
  ExternalLink,
  User
} from "lucide-react";

const TicketModal = ({ isOpen, onClose, ticket, onUpdate, onArchive }) => {
  const [adminNotes, setAdminNotes] = useState("");
  const [ticketStatus, setTicketStatus] = useState("Open");

  useEffect(() => {
    if (isOpen && ticket) {
      setAdminNotes(ticket.adminNotes || "");
      setTicketStatus(ticket.status || "Open");
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const handleSave = () => {
    onUpdate(ticket.id, ticketStatus, adminNotes);
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case "Bug Report":
        return (
          <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <Bug size={10} /> Bug
          </span>
        );
      case "UI/UX Suggestion":
        return (
          <span className="inline-flex items-center gap-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <Lightbulb size={10} /> Suggestion
          </span>
        );
      case "Account Issue":
        return (
          <span className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <UserCircle size={10} /> Account
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest whitespace-nowrap">
            <HelpCircle size={10} /> Question
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 border border-slate-200 shadow-sm">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-mono">
                {ticket.ticketId}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                {getCategoryBadge(ticket.category)}
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                <Clock size={10} /> Submitted: {ticket.date}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors self-start"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* User Context */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ticket.user === "Anonymous User" ? "bg-slate-100 text-slate-500" : "bg-[#0f172a] text-white"}`}>
                {ticket.user === "Anonymous User" ? <User size={12} /> : ticket.user.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                  Submitted By
                </p>
                <a
                  href={`/admin-users`}
                  className="text-[11px] font-semibold text-slate-900 hover:text-slate-600 flex items-center gap-1.5 transition-colors"
                >
                  {ticket.user} <ExternalLink size={10} />
                </a>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                Account ID
              </p>
              <p className="text-[11px] font-bold text-slate-600 font-mono">
                {ticket.userId}
              </p>
            </div>
          </div>

          {/* Full Issue Description */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
              <MessageSquare size={13} /> User Message
            </h4>
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
              <p className="text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap">
                "{ticket.fullMessage}"
              </p>
            </div>
          </div>

          {/* Device Metadata (Crucial for RN App) */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
              <Smartphone size={13} /> Device Metadata
            </h4>
            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Operating System
                </p>
                <p className="text-xs font-semibold text-slate-900">
                  {ticket.deviceMeta.os}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  App Version
                </p>
                <p className="text-xs font-semibold text-slate-900 font-mono">
                  {ticket.deviceMeta.appVersion}
                </p>
              </div>
              <div className="col-span-2 pt-3 border-t border-slate-200">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Device Model
                </p>
                <p className="text-xs font-semibold text-slate-900">
                  {ticket.deviceMeta.model}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Resolution Area */}
          <div>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
              <Save size={13} /> Resolution Logging
            </h4>

            <div className="space-y-5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                  Admin / Developer Notes
                </label>
                <textarea
                  rows="4"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors resize-none leading-relaxed shadow-sm"
                  placeholder="Log cause of issue and specific fixes deployed..."
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-2">
                  Ticket Status
                </label>
                <select
                  value={ticketStatus}
                  onChange={(e) => setTicketStatus(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors shadow-sm cursor-pointer text-slate-800"
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          <button
            onClick={() => onArchive(ticket.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors shadow-sm"
            title="Archive submission"
          >
            <Archive size={14} /> Archive
          </button>

          <div className="flex items-center gap-4">
            <button
              onClick={onClose}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99] shadow-sm bg-slate-900 hover:bg-slate-800"
            >
              <Save size={14} /> Update Ticket
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
