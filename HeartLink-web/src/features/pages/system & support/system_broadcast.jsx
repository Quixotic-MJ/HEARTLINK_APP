import React, { useState } from "react";
import {
  Search,
  Plus,
  Megaphone,
  Send,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "../../../api";
import AdminLayout from "../../../components/layouts/adminLayout";
import NewBroadcastModal from "../../../components/modals/NewBroadcastModal";
import ViewBroadcastModal, { CategoryBadge } from "../../../components/modals/ViewBroadcastModal";
import { UI, FONTS } from "../../../styles/tokens";
import { PageHeader } from "../../../styles/designSystem";

const Broadcasts = () => {
  const [broadcasts, setBroadcasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Toast state
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  // View Details Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState(null);

  // Pending Broadcast State for Confirmation
  const [pendingBroadcast, setPendingBroadcast] = useState(null);

  // Loading on open: state only changes once the request returns (loading starts on).
  const loadBroadcasts = async () => {
    try {
      const data = await apiFetch("/api/admin/broadcasts");
      setBroadcasts(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load announcements", "error");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loads data; its state changes come after the request returns, which this rule can't see
    loadBroadcasts();
  }, []);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => { setIsModalOpen(false); setPendingBroadcast(null); };

  const handlePublishClick = (type, msg, targetAudience, title) => {
    setPendingBroadcast({ type, message: msg, targetAudience, title });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmPublish = async () => {
    setIsSubmitting(true);
    try {
      const res = await apiFetch("/api/admin/broadcasts", {
        method: "POST",
        body: JSON.stringify({
          title: pendingBroadcast.title,
          type: pendingBroadcast.type,
          message: pendingBroadcast.message,
          targetAudience: pendingBroadcast.targetAudience
        })
      });
      setBroadcasts([res.data, ...broadcasts]);
      showToast("Announcement published successfully");
      setIsConfirmModalOpen(false);
      closeModal();
    } catch (err) {
      console.error(err);
      showToast("Failed to publish announcement", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBroadcast = async (broadcastId) => {
    try {
      await apiFetch(`/api/admin/broadcasts/${broadcastId}`, {
        method: "DELETE"
      });
      setBroadcasts(broadcasts.filter((b) => b.id !== broadcastId));
      showToast("Announcement deleted successfully");
      setViewModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to delete announcement", "error");
    }
  };

  const filteredBroadcasts = broadcasts.filter(b => 
    (b.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.message || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.display_publisher || b.publisher || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="Communication portal"
          eyebrowIcon={Megaphone}
          title="System announcements"
          description="Publish platform announcements, health alerts, and maintenance advisories to all users."
          actions={
            <button 
              onClick={openModal}
              className={UI.button.primary}
            >
              <Plus size={14} strokeWidth={2.5} /> <span>Create announcement</span>
            </button>
          }
        />

        {/* ── MAIN CARD: ANNOUNCEMENTS TABLE ── */}
        <div className="bg-ds-canvas rounded-xl border border-ds-hairline flex flex-col overflow-hidden ">
          <div className="p-4 border-b border-ds-hairline bg-ds-canvas flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search announcements by title, content, or publisher…" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-[13px] border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink transition-colors bg-ds-surface text-ds-ink placeholder:text-ds-steel" 
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-ds-hairline bg-ds-surface/40">
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">Date Published</th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em]">Publisher</th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] w-1/2">Announcement Details</th>
                  <th className="py-3 px-4 sm:px-5 text-[11px] font-semibold text-ds-steel uppercase tracking-[0.1em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-hairline">
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="flex justify-center items-center gap-2 text-ds-slate">
                        <Loader2 size={16} className="animate-spin text-ds-primary" />
                        <span className="text-[13px] font-medium">Loading announcements…</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBroadcasts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-ds-slate text-[13px] font-medium">
                      No announcements found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredBroadcasts.map((b) => (
                    <tr 
                      key={b.id} 
                      className="hover:bg-ds-surface/60 transition-colors group cursor-pointer" 
                      onClick={() => { setActiveBroadcast(b); setViewModalOpen(true); }}
                    >
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <span className="text-ds-slate font-mono font-medium text-[12px] flex items-center gap-1">
                          <Clock size={11} /> {b.date}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <span className="text-ds-ink font-semibold text-[12.5px]">
                          {b.display_publisher || (b.publisher ? b.publisher.replace(/^[^(]+\((.+)\)$/, "$1") : "System Admin")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle">
                        <div className="space-y-0.5 max-w-[440px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-ds-ink text-[13px] font-bold truncate group-hover:text-ds-primary transition-colors">
                              {b.title || "Announcement"}
                            </span>
                            <CategoryBadge category={b.type} />
                          </div>
                          <p className="text-ds-slate text-[12px] font-medium truncate">{b.message}</p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 align-middle text-right" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveBroadcast(b); setViewModalOpen(true); }}
                          className="text-[12px] font-semibold px-2.5 py-1 rounded-[6px] border border-ds-hairline bg-ds-surface text-ds-ink hover:bg-ds-hairline transition-colors inline-flex items-center gap-1 whitespace-nowrap cursor-pointer"
                        >
                          View Details <ChevronRight size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Composer Modal */}
      <NewBroadcastModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onPublish={handlePublishClick} 
      />

      {/* Read-Only View Modal */}
      <ViewBroadcastModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        broadcast={activeBroadcast} 
        onDelete={handleDeleteBroadcast}
      />

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ fontFamily: "'Inter', sans-serif" }}>
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer" 
            onClick={() => setIsConfirmModalOpen(false)}
          />
          <div className="bg-ds-canvas p-6 rounded-2xl shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in-95 duration-200 border border-ds-hairline text-ds-ink flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center gap-3 mb-3.5">
              <div className="w-10 h-10 rounded-[8px] bg-ds-yellow flex items-center justify-center shrink-0 border border-ds-yellow-bold text-ds-warm-text">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 
                  className="text-[17px] font-medium text-ds-ink leading-tight"
                >
                  Confirm Announcement
                </h3>
                <p className="text-[11px] text-ds-slate font-medium">Review details before publishing to all users</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
              {/* Title & Category */}
              <div className="bg-ds-surface/60 p-3.5 rounded-[8px] border border-ds-hairline space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Title</span>
                  <CategoryBadge category={pendingBroadcast?.type} />
                </div>
                <p className="text-[13px] font-bold text-ds-ink">{pendingBroadcast?.title || "Untitled Announcement"}</p>
              </div>

              {/* Audience */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-ds-surface/60 rounded-[8px] border border-ds-hairline text-[12px]">
                <span className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Audience</span>
                <span className="font-bold text-ds-ink">{pendingBroadcast?.targetAudience || "All Registered Accounts"}</span>
              </div>

              {/* Message Preview */}
              <div className="space-y-1">
                <span className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider block">Message Preview</span>
                <div className="bg-ds-surface/40 rounded-[8px] border border-ds-hairline p-3 max-h-36 overflow-y-auto">
                  <p className="text-[12.5px] text-ds-ink leading-relaxed whitespace-pre-wrap select-text font-medium">
                    {pendingBroadcast?.message}
                  </p>
                </div>
              </div>

              <p className="text-[11.5px] text-ds-slate leading-relaxed pt-1">
                This message will be published to <strong className="text-ds-ink">{pendingBroadcast?.targetAudience || "all users"}</strong> immediately. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2.5 pt-3.5 border-t border-ds-hairline mt-3">
              <button 
                disabled={isSubmitting} 
                onClick={() => setIsConfirmModalOpen(false)} 
                className="flex-1 px-4 py-2 text-[12px] font-semibold text-ds-ink hover:bg-ds-hairline bg-ds-surface rounded-[8px] transition-colors border border-ds-hairline disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isSubmitting} 
                onClick={handleConfirmPublish} 
                className="flex-1 px-4 py-2 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary-pressed rounded-[8px] transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />} 
                <span>{isSubmitting ? "Sending…" : "Yes, publish"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 animate-in slide-in-from-bottom-5 duration-300 bg-ds-canvas ${toast.type === 'error' ? 'border-ds-rose text-ds-danger' : 'border-ds-mint text-ds-charcoal'}`}>
          {toast.type === 'error' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
          <span className="text-[12.5px] font-semibold text-ds-ink">{toast.message}</span>
        </div>
      )}
    </AdminLayout>
  );
};

export default Broadcasts;
