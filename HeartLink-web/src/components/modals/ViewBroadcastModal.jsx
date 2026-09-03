import React, { useState } from "react";
import { X, CheckCircle2, Megaphone, Info, ShieldAlert, Wrench, AlertTriangle, Trash2 } from "lucide-react";

export const getCategoryBadge = (category) => {
  switch (category) {
    case "Maintenance":
      return (
        <span className="inline-flex items-center gap-1 bg-[#F6EDDD] text-[#A9741B] border border-[#EBD7B8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
          <Wrench size={10} /> Maintenance
        </span>
      );
    case "App Update":
      return (
        <span className="inline-flex items-center gap-1 bg-[#EDF1EF] text-[#152131] border border-[#DCE3DF] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
          <Info size={10} /> Update
        </span>
      );
    case "Safety Reminder":
      return (
        <span className="inline-flex items-center gap-1 bg-[#F7E4E1] text-[#A93226] border border-[#F0C4B8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
          <ShieldAlert size={10} /> Safety
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 bg-[#E3EFEC] text-[#1B6E63] border border-[#C5DFD8] px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
        <div 
          className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer" 
          onClick={onClose}
        />
        <div className="relative w-full max-w-md bg-[#FFFFFF] max-h-full rounded-2xl shadow-2xl border border-[#DCE3DF] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-[#152131]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#DCE3DF] bg-[#FFFFFF] z-10">
            <div className="flex items-center gap-2.5">
              <h3 
                className="text-[17px] font-medium text-[#152131] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Announcement Details
              </h3>
              {getCategoryBadge(broadcast.type)}
            </div>
            <button 
              onClick={onClose} 
              className="text-[#5C6B66] hover:text-[#152131] p-1.5 rounded-lg hover:bg-[#EDF1EF] transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 space-y-4.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Title */}
            {(broadcast.title || broadcast.type) && (
              <div>
                <h4 className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1 mb-2">
                  Announcement Title
                </h4>
                <p 
                  className="text-[16px] font-medium text-[#152131]"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  {broadcast.title || broadcast.type}
                </p>
              </div>
            )}

            {/* Meta Info Card */}
            <div className="bg-[#EDF1EF]/60 p-3.5 rounded-[8px] border border-[#DCE3DF] flex flex-col gap-2 text-[12px]">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">Published On</span>
                <span className="font-mono font-semibold text-[#152131]">{broadcast.date}</span>
              </div>
              <div className="h-px w-full bg-[#DCE3DF]"></div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider">Published By</span>
                <span className="font-semibold text-[#152131]">
                  {broadcast.display_publisher ||
                    (broadcast.publisher
                      ? broadcast.publisher.replace(/^[^(]+\((.+)\)$/, "$1")
                      : "System Admin")}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <h4 className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider border-b border-[#DCE3DF] pb-1 mb-2">
                Announcement Message
              </h4>
              <div className="bg-[#EDF1EF]/40 rounded-[8px] border border-[#DCE3DF] p-3.5">
                <p className="text-[12.5px] text-[#152131] leading-relaxed whitespace-pre-wrap font-medium">
                  {broadcast.message}
                </p>
              </div>
            </div>

            {/* Recipient count (if returned by API) */}
            {typeof broadcast.recipients_count === "number" ? (
              <div className="bg-[#E3EFEC] p-3 rounded-[8px] border border-[#C5DFD8] flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-[#1B6E63]" />
                  <span className="text-[12px] font-bold text-[#1B6E63]">Delivered</span>
                </div>
                <span className="text-[10px] font-bold text-[#1B6E63] bg-[#C5DFD8]/60 px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                  {broadcast.recipients_count} recipient{broadcast.recipients_count !== 1 ? "s" : ""}
                </span>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#DCE3DF] bg-[#FFFFFF] flex justify-between shrink-0 items-center">
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-3.5 py-1.5 text-[12px] font-semibold text-[#A93226] bg-[#F7E4E1] hover:bg-[#F0C4B8] rounded-[6px] transition-colors border border-[#F0C4B8] shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} /> <span>Delete</span>
            </button>
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[8px] transition-colors shadow-2xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* In-App Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer" 
            onClick={() => setIsDeleteConfirmOpen(false)}
          />
          <div className="bg-[#FFFFFF] p-5 rounded-2xl shadow-2xl max-w-sm w-full relative animate-in fade-in zoom-in-95 duration-200 border border-[#DCE3DF] text-[#152131]">
            <div className="w-10 h-10 rounded-[8px] bg-[#F7E4E1] flex items-center justify-center mb-3 border border-[#F0C4B8] text-[#A93226]">
              <AlertTriangle size={18} />
            </div>
            <h4 
              className="text-[17px] font-medium text-[#152131] mb-1 leading-tight"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Delete Announcement?
            </h4>
            <p className="text-[12px] text-[#5C6B66] leading-relaxed mb-5">
              Are you sure you want to delete this broadcast? It will be removed from user announcement feeds immediately.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)} 
                className="flex-1 px-3.5 py-2 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] rounded-[8px] transition-colors border border-[#DCE3DF] cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="flex-1 px-3.5 py-2 text-[12px] font-semibold text-white bg-[#A93226] hover:bg-[#8A1F1A] rounded-[8px] transition-colors shadow-2xs cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ViewBroadcastModal;
