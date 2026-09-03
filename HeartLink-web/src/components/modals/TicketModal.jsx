import React, { useState, useEffect } from "react";
import {
  X,
  MessageSquare,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={handleCloseAttempt}
      />

      {/* Modal Panel */}
      <div className="relative w-full max-w-lg bg-[#FFFFFF] max-h-full rounded-2xl shadow-2xl border border-[#DCE3DF] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-[#152131]">
        
        {/* Custom Confirmation Overlays */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xs">
            <div className="bg-[#FFFFFF] rounded-2xl p-5 max-w-sm shadow-2xl border border-[#DCE3DF] flex flex-col text-left">
              <h4 
                className="text-[16px] font-medium text-[#152131] mb-1.5"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Discard unsaved changes?
              </h4>
              <p className="text-[12px] text-[#5C6B66] mb-5 leading-relaxed">
                You have unsaved changes in your notes or status. Are you sure you want to discard them?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDiscardConfirm(false)}
                  className="px-3.5 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
                >
                  Keep Editing
                </button>
                <button
                  onClick={() => {
                    setShowDiscardConfirm(false);
                    onClose();
                  }}
                  className="px-3.5 py-1.5 text-[12px] font-semibold bg-[#A93226] text-white rounded-[8px] hover:bg-[#8A1F1A] shadow-2xs transition-colors cursor-pointer"
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        )}

        {showArchiveConfirm && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xs">
            <div className="bg-[#FFFFFF] rounded-2xl p-5 max-w-sm shadow-2xl border border-[#DCE3DF] flex flex-col text-left">
              <h4 
                className="text-[16px] font-medium text-[#152131] mb-1.5"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Archive this feedback ticket?
              </h4>
              <p className="text-[12px] text-[#5C6B66] mb-5 leading-relaxed">
                Archived tickets remain accessible and can be restored at any time.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowArchiveConfirm(false)}
                  className="px-3.5 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleArchiveConfirmAction}
                  className="px-3.5 py-1.5 text-[12px] font-semibold bg-[#E8532E] text-white rounded-[8px] hover:bg-[#C13E20] shadow-2xs transition-colors cursor-pointer"
                >
                  Archive Ticket
                </button>
              </div>
            </div>
          </div>
        )}

        {conflictError && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-6 bg-black/60 backdrop-blur-xs">
            <div className="bg-[#FFFFFF] rounded-2xl p-5 max-w-sm shadow-2xl border border-[#DCE3DF] flex flex-col text-left">
              <h4 
                className="text-[16px] font-medium text-[#A93226] mb-1.5 flex items-center gap-1.5"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                <AlertCircle size={16} /> Conflict Detected
              </h4>
              <p className="text-[12px] text-[#5C6B66] mb-5 leading-relaxed">
                This ticket was updated by another administrator. Reload the latest version before saving.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConflictError(false)}
                  className="px-3.5 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
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
                  className="px-3.5 py-1.5 text-[12px] font-semibold bg-[#E8532E] text-white rounded-[8px] hover:bg-[#C13E20] shadow-2xs transition-colors cursor-pointer"
                >
                  Reload Latest
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#DCE3DF] bg-[#FFFFFF] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#FBEAE6] flex items-center justify-center text-[#E8532E] border border-[#F5C7BD] shadow-2xs shrink-0">
              <MessageSquare size={16} />
            </div>
            <div>
              <h3 
                className="text-[17px] font-medium text-[#152131] flex items-center gap-2 font-mono tracking-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {ticket.ticketId}
              </h3>
              <div className="mt-0.5 flex items-center gap-2">
                <FeedbackCategoryBadge category={ticket.category} />
                <span className="text-[11px] text-[#8B9893] font-medium flex items-center gap-1">
                  <Clock size={10} /> {ticket.date}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleCloseAttempt}
            className="text-[#5C6B66] hover:text-[#152131] p-1.5 rounded-lg hover:bg-[#EDF1EF] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden space-y-4.5">
          {/* Account ID Context */}
          <div className="flex items-center justify-between bg-[#EDF1EF]/60 p-3.5 rounded-[8px] border border-[#DCE3DF]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center bg-[#FBEAE6] text-[#E8532E] border border-[#F5C7BD]">
                <User size={12} />
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">
                  Account Reference ID
                </p>
                <p className="text-[12.5px] font-bold text-[#152131] font-mono leading-tight">
                  {ticket.userId || "N/A"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Full Issue Description */}
          <div>
            <h4 className="text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1.5 mb-2 flex items-center gap-1.5">
              <MessageSquare size={12} className="text-[#E8532E]" /> User message
            </h4>
            <div className="bg-[#EDF1EF]/50 rounded-[8px] border border-[#DCE3DF] p-3.5">
              <p className="text-[12.5px] text-[#152131] leading-relaxed whitespace-pre-wrap font-medium">
                "{ticket.fullMessage}"
              </p>
            </div>
          </div>

          {/* Device Metadata */}
          <div>
            <h4 className="text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1.5 mb-2 flex items-center gap-1.5">
              <Smartphone size={12} className="text-[#1B6E63]" /> Device metadata
            </h4>
            <div className="bg-[#FFFFFF] p-3.5 rounded-[8px] border border-[#DCE3DF] grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-0.5">
                  Operating System
                </p>
                <p className="font-bold text-[#152131]">
                  {ticket.deviceMeta?.os || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-0.5">
                  App Version
                </p>
                <p className="font-bold text-[#152131] font-mono">
                  {ticket.deviceMeta?.appVersion || "N/A"}
                </p>
              </div>
              <div className="col-span-2 pt-2 border-t border-[#DCE3DF]">
                <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-0.5">
                  Device Model
                </p>
                <p className="font-bold text-[#152131]">
                  {ticket.deviceMeta?.model || "N/A"}
                </p>
              </div>
            </div>
          </div>

          {/* Admin Resolution Area */}
          <div>
            <h4 className="text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1.5 mb-2 flex items-center gap-1.5">
              <Save size={12} className="text-[#1B6E63]" /> Resolution logging
            </h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                  Admin / Developer Notes
                </label>
                <textarea
                  rows="3"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-[12.5px] bg-[#EDF1EF] border border-[#DCE3DF] text-[#152131] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors resize-none leading-relaxed placeholder:text-[#8B9893]"
                  placeholder="Log root cause of issue or specific fixes deployed…"
                />
              </div>

              {!isArchived ? (
                <div>
                  <label className="block text-[10.5px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                    Ticket Status
                  </label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className="w-full px-3 py-2 text-[12.5px] font-semibold bg-[#EDF1EF] border border-[#DCE3DF] text-[#152131] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors cursor-pointer"
                  >
                    <option value="Open">Open</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-[#EDF1EF]/60 rounded-[8px] border border-[#DCE3DF] flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-0.5">
                      Current Status
                    </p>
                    <p className="text-[12px] font-bold text-[#5C6B66] uppercase">Archived</p>
                  </div>
                  <span className="text-[11px] text-[#5C6B66] italic font-medium">
                    Restoring returns ticket to Open
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="px-6 py-4 border-t border-[#DCE3DF] bg-[#FFFFFF] flex justify-between items-center shrink-0">
          {!isArchived ? (
            <button
              onClick={handleArchiveClick}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold text-[#5C6B66] hover:text-[#152131] bg-[#EDF1EF] border border-[#DCE3DF] hover:bg-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
              title="Archive submission"
            >
              <Archive size={13} /> <span>Archive</span>
            </button>
          ) : (
            <button
              onClick={handleRestoreClick}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[12px] font-semibold bg-[#1B6E63] hover:bg-[#14534B] text-white rounded-[8px] transition-colors shadow-2xs cursor-pointer"
              title="Restore archived ticket"
            >
              <RotateCcw size={13} /> <span>Restore ticket</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleCloseAttempt}
              className="px-3.5 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {!isArchived && (
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white rounded-[8px] shadow-2xs bg-[#E8532E] hover:bg-[#C13E20] transition-colors cursor-pointer"
              >
                <Save size={13} /> <span>Update ticket</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketModal;
