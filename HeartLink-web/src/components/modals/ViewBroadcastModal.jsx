import { useState } from "react";
import { X, CheckCircle2, Megaphone, Info, ShieldAlert, Wrench, AlertTriangle, Trash2 } from "lucide-react";

export const CategoryBadge = ({ category }) => {
  switch (category) {
    case "Maintenance":
      return (
        <span className="inline-flex items-center gap-1 bg-ds-yellow text-ds-warm-text border border-ds-yellow-bold px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <Wrench size={10} /> Maintenance
        </span>
      );
    case "App Update":
      return (
        <span className="inline-flex items-center gap-1 bg-ds-surface text-ds-ink border border-ds-hairline px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <Info size={10} /> Update
        </span>
      );
    case "Safety Reminder":
      return (
        <span className="inline-flex items-center gap-1 bg-ds-rose text-ds-ink border border-ds-rose px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
          <ShieldAlert size={10} /> Safety
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 bg-ds-mint text-ds-charcoal border border-ds-mint px-2 py-0.5 rounded-[4px] text-[11px] font-bold uppercase tracking-wider whitespace-nowrap">
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
        <div className="relative w-full max-w-md bg-ds-canvas max-h-full rounded-2xl shadow-2xl border border-ds-hairline flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-ds-ink">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4.5 border-b border-ds-hairline bg-ds-canvas z-10">
            <div className="flex items-center gap-2.5">
              <h3 
                className="text-[17px] font-medium text-ds-ink leading-tight"
              >
                Announcement Details
              </h3>
              <CategoryBadge category={broadcast.type} />
            </div>
            <button 
              onClick={onClose} 
              className="text-ds-slate hover:text-ds-ink p-1.5 rounded-lg hover:bg-ds-surface transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 space-y-4.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {/* Title */}
            {(broadcast.title || broadcast.type) && (
              <div>
                <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-1 mb-2">
                  Announcement Title
                </h4>
                <p 
                  className="text-[16px] font-medium text-ds-ink"
                >
                  {broadcast.title || broadcast.type}
                </p>
              </div>
            )}

            {/* Meta Info Card */}
            <div className="bg-ds-surface/60 p-3.5 rounded-[8px] border border-ds-hairline flex flex-col gap-2 text-[12px]">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Published On</span>
                <span className="font-mono font-semibold text-ds-ink">{broadcast.date}</span>
              </div>
              <div className="h-px w-full bg-ds-hairline"></div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Published By</span>
                <span className="font-semibold text-ds-ink">
                  {broadcast.display_publisher ||
                    (broadcast.publisher
                      ? broadcast.publisher.replace(/^[^(]+\((.+)\)$/, "$1")
                      : "System Admin")}
                </span>
              </div>
            </div>

            {/* Message Body */}
            <div>
              <h4 className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider border-b border-ds-hairline pb-1 mb-2">
                Announcement Message
              </h4>
              <div className="bg-ds-surface/40 rounded-[8px] border border-ds-hairline p-3.5">
                <p className="text-[12.5px] text-ds-ink leading-relaxed whitespace-pre-wrap font-medium">
                  {broadcast.message}
                </p>
              </div>
            </div>

            {/* Recipient count (if returned by API) */}
            {typeof broadcast.recipients_count === "number" ? (
              <div className="bg-ds-mint p-3 rounded-[8px] border border-ds-mint flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-ds-charcoal" />
                  <span className="text-[12px] font-bold text-ds-charcoal">Delivered</span>
                </div>
                <span className="text-[11px] font-bold text-ds-charcoal bg-ds-mint/60 px-2 py-0.5 rounded-[4px] uppercase tracking-wider">
                  {broadcast.recipients_count} recipient{broadcast.recipients_count !== 1 ? "s" : ""}
                </span>
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-ds-hairline bg-ds-canvas flex justify-between shrink-0 items-center">
            <button 
              onClick={() => setIsDeleteConfirmOpen(true)}
              className="px-3.5 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-rose hover:bg-ds-rose rounded-[6px] transition-colors border border-ds-rose flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={13} /> <span>Delete</span>
            </button>
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer"
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
          <div className="bg-ds-canvas p-5 rounded-2xl shadow-2xl max-w-sm w-full relative animate-in fade-in zoom-in-95 duration-200 border border-ds-hairline text-ds-ink">
            <div className="w-10 h-10 rounded-[8px] bg-ds-rose flex items-center justify-center mb-3 border border-ds-rose text-ds-ink">
              <AlertTriangle size={18} />
            </div>
            <h4 
              className="text-[17px] font-medium text-ds-ink mb-1 leading-tight"
            >
              Delete Announcement?
            </h4>
            <p className="text-[12px] text-ds-slate leading-relaxed mb-5">
              Are you sure you want to delete this broadcast? It will be removed from user announcement feeds immediately.
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)} 
                className="flex-1 px-3.5 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline rounded-[8px] transition-colors border border-ds-hairline cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmDelete} 
                className="flex-1 px-3.5 py-2 text-[12px] font-semibold text-white bg-ds-danger hover:bg-ds-danger rounded-[8px] transition-colors cursor-pointer"
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
