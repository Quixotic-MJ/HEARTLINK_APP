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
  AlertCircle,
  RotateCcw,
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={handleCloseAttempt}
      ></div>

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-[#1A1A1A] max-h-full rounded-2xl shadow-2xl border border-white/10 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-white">
        
        {/* Custom Confirmation Overlays */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-sm shadow-2xl border border-white/10 flex flex-col text-left">
              <h4 className="text-sm font-bold text-white mb-2">Discard unsaved changes?</h4>
              <p className="text-xs text-[#89899C] mb-6 leading-relaxed">
                You have unsaved changes in your notes or status. Are you sure you want to discard them?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow-sm transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {showArchiveConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-sm shadow-2xl border border-white/10 flex flex-col text-left">
              <h4 className="text-sm font-bold text-white mb-2">Archive this feedback ticket?</h4>
              <p className="text-xs text-[#89899C] mb-6 leading-relaxed">
                Archived tickets remain available and can be restored at any time.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchiveConfirmAction}
                  className="px-4 py-2 text-xs font-bold bg-[#E55F37] text-white rounded-xl hover:bg-[#D4542E] shadow-sm transition-colors cursor-pointer"
                >
                  Archive Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {conflictError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/75 backdrop-blur-sm">
            <div className="bg-[#1A1A1A] rounded-2xl p-6 max-w-sm shadow-2xl border border-white/10 flex flex-col text-left">
              <h4 className="text-sm font-bold text-rose-400 mb-2 flex items-center gap-1.5">
                <AlertCircle size={16} /> Conflict Detected
              </h4>
              <p className="text-xs text-[#89899C] mb-6 leading-relaxed">
                This feedback ticket was updated by another administrator. Reload the latest version before saving.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConflictError(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] border border-white/10 rounded-xl transition-colors cursor-pointer"
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
                  className="px-4 py-2 text-xs font-bold bg-[#E55F37] text-white rounded-xl hover:bg-[#D4542E] shadow-sm transition-colors cursor-pointer"
                >
                  Reload Latest
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#161616] z-10">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#36272B] flex items-center justify-center text-[#E55F37] border border-[#E55F37]/30 shadow-sm shrink-0">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-mono">
                {ticket.ticketId}
              </h3>
              <div className="mt-1 flex items-center gap-2">
                <FeedbackCategoryBadge category={ticket.category} />
              </div>
              <p className="text-[10px] text-[#89899C] mt-1 font-medium flex items-center gap-1">
                <Clock size={10} /> Submitted: {ticket.date}
              </p>
            </div>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors self-start cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
          {/* Account ID Context */}
          <div className="flex items-center justify-between bg-[#21202E]/40 p-4 rounded-xl border border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#36272B] text-[#E55F37] border border-[#E55F37]/30">
                <User size={12} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest mb-0.5">
                  Account Reference ID
                </p>
                <p className="text-xs font-bold text-white font-mono">
                  {ticket.userId || "N/A"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Full Issue Description */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-3 flex items-center gap-1.5">
              <MessageSquare size={13} className="text-[#E55F37]" /> User Message
            </h4>
            <div className="bg-[#161616] rounded-xl border border-white/10 p-5">
              <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                "{ticket.fullMessage}"
              </p>
            </div>
          </div>

          {/* Device Metadata */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-3 flex items-center gap-1.5">
              <Smartphone size={13} className="text-indigo-400" /> Device Metadata
            </h4>
            <div className="bg-[#161616] p-5 rounded-xl border border-white/10 grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">
                  Operating System
                </p>
                <p className="text-xs font-bold text-white">
                  {ticket.deviceMeta?.os || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">
                  App Version
                </p>
                <p className="text-xs font-bold text-white font-mono">
                  {ticket.deviceMeta?.appVersion || "N/A"}
                </p>
              </div>
              <div className="col-span-2 pt-3 border-t border-white/10">
                <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-wider mb-1">
                  Device Model
                </p>
                <p className="text-xs font-bold text-white">
                  {ticket.deviceMeta?.model || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Resolution Area */}
          <div>
            <h4 className="text-[10px] font-bold text-[#89899C] uppercase tracking-[0.2em] border-b border-white/10 pb-2 mb-3 flex items-center gap-1.5">
              <Save size={13} className="text-emerald-400" /> Resolution Logging
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-2">
                  Admin / Developer Notes
                </label>
                <textarea
                  rows="4"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-4 py-3 text-xs bg-[#161616] border border-white/10 text-white rounded-xl focus:outline-none focus:border-[#E55F37] transition-colors resize-none leading-relaxed placeholder:text-slate-500"
                  placeholder="Log cause of issue and specific fixes deployed..."
                />
              </div>

              {!isArchived ? (
                <div>
                  <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-2">
                    Ticket Status
                  </label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs font-semibold bg-[#161616] border border-white/10 text-white rounded-xl focus:outline-none focus:border-[#E55F37] transition-colors cursor-pointer"
                  >
                    <option value="Open" className="bg-[#161616]">Open</option>
                    <option value="In Progress" className="bg-[#161616]">In Progress</option>
                    <option value="Resolved" className="bg-[#161616]">Resolved</option>
                    <option value="Archived" className="bg-[#161616]">Archived</option>
                  </select>
                </div>
              ) : (
                <div className="p-4 bg-[#21202E]/50 rounded-xl border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest mb-0.5">
                      Current Status
                    </p>
                    <p className="text-xs font-bold text-slate-400 uppercase">Archived</p>
                  </div>
                  <span className="text-[10px] text-slate-400 italic font-medium">
                    Restoring returns ticket to Open
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-5 border-t border-white/10 bg-[#161616] flex justify-between items-center shrink-0">
          {!isArchived ? (
            <button
              onClick={handleArchiveClick}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-[#21202E] border border-white/10 hover:border-white/20 rounded-xl transition-colors cursor-pointer"
              title="Archive submission"
            >
              <Archive size={14} /> Archive
            </button>
          ) : (
            <button
              onClick={handleRestoreClick}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm cursor-pointer"
              title="Restore archived ticket"
            >
              <RotateCcw size={14} /> Restore Ticket
            </button>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={handleCloseAttempt}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {!isArchived && (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl transition-all shadow-sm shadow-[#E55F37]/25 bg-[#E55F37] hover:bg-[#D4542E] cursor-pointer"
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

