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
  User,
  AlertCircle
} from "lucide-react";
import FeedbackCategoryBadge from "../ui/FeedbackCategoryBadge";
import { apiFetch } from "../../api";

const TicketModal = ({ isOpen, onClose, ticket, onUpdate, onArchive }) => {
  const [adminNotes, setAdminNotes] = useState("");
  const [ticketStatus, setTicketStatus] = useState("Open");

  // Keep track of original values to detect changes
  const [initialNotes, setInitialNotes] = useState("");
  const [initialStatus, setInitialStatus] = useState("Open");

  // Confirmation Overlays states
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Concurrency Conflict states
  const [conflictError, setConflictError] = useState(false);
  const [serverTicketData, setServerTicketData] = useState(null);

  useEffect(() => {
    if (isOpen && ticket) {
      setAdminNotes(ticket.adminNotes || "");
      setTicketStatus(ticket.status || "Open");
      setInitialNotes(ticket.adminNotes || "");
      setInitialStatus(ticket.status || "Open");
      
      // Reset confirmation and error states
      setShowDiscardConfirm(false);
      setShowArchiveConfirm(false);
      setConflictError(false);
      setServerTicketData(null);
    }
  }, [isOpen, ticket?.id]);

  if (!isOpen || !ticket) return null;

  // Compute if local edits differ from original values
  const hasUnsavedChanges = adminNotes !== initialNotes || ticketStatus !== initialStatus;

  // Intercept close events to check for dirty state
  const handleCloseAttempt = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  // Check backend to verify no concurrent updates have occurred
  const checkConcurrencyConflict = async () => {
    try {
      const latestTickets = await apiFetch("/api/feedback");
      if (latestTickets) {
        const serverTicket = latestTickets.find((t) => t.id === ticket.id);
        if (serverTicket) {
          const statusChanged = serverTicket.status !== initialStatus;
          const notesChanged = serverTicket.adminNotes !== initialNotes;
          if (statusChanged || notesChanged) {
            setServerTicketData(serverTicket);
            setConflictError(true);
            return true; // Conflict found!
          }
        }
      }
    } catch (e) {
      console.error("Conflict check failed:", e);
    }
    return false; // No conflict
  };

  const handleSave = async () => {
    const isConflict = await checkConcurrencyConflict();
    if (isConflict) return; // Block saving
    onUpdate(ticket.id, ticketStatus, adminNotes);
  };

  const handleArchiveClick = () => {
    setShowArchiveConfirm(true);
  };

  const handleArchiveConfirmAction = async () => {
    const isConflict = await checkConcurrencyConflict();
    if (isConflict) {
      setShowArchiveConfirm(false);
      return; // Block saving, conflict overlay will show
    }
    onArchive(ticket.id, adminNotes);
    setShowArchiveConfirm(false);
  };

  const handleRestoreClick = async () => {
    const isConflict = await checkConcurrencyConflict();
    if (isConflict) return; // Block restore
    
    // Archived tickets are restored to Open.
    onUpdate(ticket.id, "Open", adminNotes);
  };

  const isArchived = ticket.status === "Archived";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={handleCloseAttempt}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Custom Confirmation Overlays */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm shadow-2xl border border-slate-100 flex flex-col text-left">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Discard unsaved changes?</h4>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                You have unsaved changes in your notes or status. Are you sure you want to discard them?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-red-600 text-white rounded-xl hover:bg-red-700 shadow-sm transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {showArchiveConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm shadow-2xl border border-slate-100 flex flex-col text-left">
              <h4 className="text-sm font-bold text-slate-900 mb-2">Archive this feedback ticket?</h4>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Archived tickets remain available and can be restored.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchiveConfirmAction}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-850 shadow-sm transition-colors cursor-pointer"
                >
                  Archive Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {conflictError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm shadow-2xl border border-slate-100 flex flex-col text-left">
              <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5 text-red-600">
                <AlertCircle size={16} /> Conflict Detected
              </h4>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                This feedback ticket was updated by another administrator. Reload the latest version before saving.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConflictError(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (serverTicketData) {
                      setAdminNotes(serverTicketData.adminNotes || "");
                      setTicketStatus(serverTicketData.status || "Open");
                      setInitialNotes(serverTicketData.adminNotes || "");
                      setInitialStatus(serverTicketData.status || "Open");
                    }
                    setConflictError(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-850 shadow-sm transition-colors cursor-pointer"
                >
                  Reload Latest
                </button>
              </div>
            </div>
          </div>
        )}

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
                <FeedbackCategoryBadge category={ticket.category} />
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                <Clock size={10} /> Submitted: {ticket.date}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors self-start cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Account ID Context */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#0f172a] text-white">
                <User size={12} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0.5">
                  Account ID
                </p>
                <p className="text-[11px] font-bold text-slate-900 font-mono">
                  {ticket.userId || "N/A"}
                </p>
              </div>
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

          {/* Device Metadata */}
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

              {!isArchived ? (
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
              ) : (
                <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">
                      Current Status
                    </p>
                    <p className="text-xs font-bold text-slate-500 uppercase">Archived</p>
                  </div>
                  <span className="text-[10px] text-slate-500 italic font-medium">
                    Restoring returns ticket to Open
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
          {!isArchived ? (
            <button
              onClick={handleArchiveClick}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors shadow-sm cursor-pointer"
              title="Archive submission"
            >
              <Archive size={14} /> Archive
            </button>
          ) : (
            <button
              onClick={handleRestoreClick}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm cursor-pointer"
              title="Restore archived ticket"
            >
              Restore Ticket
            </button>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={handleCloseAttempt}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {!isArchived && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 text-xs font-medium text-white rounded-xl transition-all hover:opacity-90 active:scale-[0.99] shadow-sm bg-slate-900 hover:bg-slate-850 cursor-pointer"
              >
                <Save size={14} /> Update Ticket
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
