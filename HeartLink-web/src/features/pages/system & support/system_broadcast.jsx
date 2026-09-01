import React, { useState } from "react";
import {
  Search,
  Plus,
  X,
  Megaphone,
  Save,
  Send,
  Clock,
  UserCircle,
  AlertTriangle,
  FileText,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "../../../api";
import AdminLayout from "../../../components/layouts/adminLayout";
import NewBroadcastModal from "../../../components/modals/NewBroadcastModal";
import ViewBroadcastModal, { getCategoryBadge } from "../../../components/modals/ViewBroadcastModal";

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

  React.useEffect(() => {
    fetchBroadcasts();
  }, []);

  const fetchBroadcasts = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/api/admin/broadcasts");
      setBroadcasts(data);
    } catch (err) {
      console.error(err);
      showToast("Failed to load announcements", "error");
    } finally {
      setIsLoading(false);
    }
  };

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
    b.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (b.display_publisher || b.publisher || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col h-full animate-in fade-in duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-[#E55F37]/30 bg-[#E55F37]/10 text-[10px] font-bold uppercase tracking-widest text-[#E55F37] mb-2">
              <Megaphone size={11} />
              <span>Communication Portal</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-tight leading-tight">
              System Announcements
            </h2>
            <p className="text-[#89899C] text-xs mt-1 font-medium">
              Publish critical health alerts, platform updates, and maintenance advisories to all users.
            </p>
          </div>
          <button 
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#E55F37] hover:bg-[#D4542E] rounded-xl shadow-sm shadow-[#E55F37]/25 transition-all cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} /> Create Announcement
          </button>
        </div>

        {/* Main View: History Log Table */}
        <div className="bg-[#1A1A1A] rounded-2xl border border-white/10 flex flex-col overflow-hidden animate-in fade-in duration-300">
          <div className="p-4 border-b border-white/10 bg-[#161616] flex gap-3">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search announcements..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs border border-white/10 rounded-xl focus:outline-none focus:border-[#E55F37] transition-all bg-[#1A1A1A] text-white placeholder:text-slate-500" 
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">Date Published</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em]">Publisher</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] w-1/2">Message Preview</th>
                  <th className="py-3 px-6 text-[10px] font-bold text-[#89899C] uppercase tracking-[0.15em] text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center">
                      <div className="flex justify-center items-center gap-2 text-slate-400">
                        <Loader2 size={16} className="animate-spin text-[#E55F37]" />
                        <span className="text-xs font-medium">Loading announcements...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBroadcasts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-12 text-center text-slate-400 text-xs font-medium">
                      No announcements found matching your query.
                    </td>
                  </tr>
                ) : (
                  filteredBroadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => { setActiveBroadcast(b); setViewModalOpen(true); }}>
                      <td className="py-4 px-6 align-middle">
                        <span className="text-[#89899C] font-mono font-medium text-xs flex items-center gap-1.5">
                          <Clock size={11} /> {b.date}
                        </span>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <span className="text-slate-300 font-semibold text-xs">
                          {b.display_publisher || (b.publisher ? b.publisher.replace(/^[^(]+\((.+)\)$/, "$1") : "System Admin")}
                        </span>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="space-y-1 max-w-[420px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white text-xs font-bold truncate group-hover:text-[#E55F37] transition-colors">
                              {b.title || "Announcement"}
                            </span>
                            {getCategoryBadge(b.type)}
                          </div>
                          <p className="text-[#89899C] text-xs font-medium truncate">{b.message}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle text-right">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setActiveBroadcast(b); setViewModalOpen(true); }}
                          className="text-[10px] font-bold px-3.5 py-1.5 rounded-xl border border-white/10 bg-[#21202E] text-slate-300 hover:text-white hover:border-white/20 transition-colors shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
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

      {/* Extracted Composer Modal */}
      <NewBroadcastModal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        onPublish={handlePublishClick} 
      />

      {/* Extracted Read-Only View Modal */}
      <ViewBroadcastModal 
        isOpen={viewModalOpen} 
        onClose={() => setViewModalOpen(false)} 
        broadcast={activeBroadcast} 
        onDelete={handleDeleteBroadcast}
      />

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer" onClick={() => setIsConfirmModalOpen(false)}></div>
          <div className="bg-[#1A1A1A] p-6 rounded-2xl shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in-95 duration-200 border border-white/10 text-white flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 border border-amber-500/20 text-amber-400">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Confirm Announcement</h3>
                <p className="text-xs text-[#89899C] font-medium">Review details before publishing to all users</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar py-2">
              {/* Title & Category */}
              <div className="bg-[#21202E]/40 p-3.5 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest">Title</span>
                  {getCategoryBadge(pendingBroadcast?.type)}
                </div>
                <p className="text-xs font-bold text-white">{pendingBroadcast?.title || "Untitled Announcement"}</p>
              </div>

              {/* Audience */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#21202E]/40 rounded-xl border border-white/10 text-xs">
                <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest">Audience</span>
                <span className="font-bold text-white">{pendingBroadcast?.targetAudience || "All Registered Accounts"}</span>
              </div>

              {/* Message Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest block">Message Preview</span>
                <div className="bg-[#161616] rounded-xl border border-white/10 p-3.5 max-h-36 overflow-y-auto custom-scrollbar">
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap select-text font-medium">
                    {pendingBroadcast?.message}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#89899C] leading-relaxed pt-1">
                This message will be published to <strong className="text-white">{pendingBroadcast?.targetAudience || "all users"}</strong> immediately. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-3 border-t border-white/10 mt-3">
              <button 
                disabled={isSubmitting} 
                onClick={() => setIsConfirmModalOpen(false)} 
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white bg-[#21202E] rounded-xl transition-colors border border-white/10 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                disabled={isSubmitting} 
                onClick={handleConfirmPublish} 
                className="flex-1 px-4 py-2.5 text-xs font-bold text-white bg-[#E55F37] hover:bg-[#D4542E] rounded-xl shadow-sm shadow-[#E55F37]/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} 
                {isSubmitting ? "Sending..." : "Yes, Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'error' ? 'bg-[#1A1A1A] border-rose-500/30 text-rose-400' : 'bg-[#1A1A1A] border-emerald-500/30 text-emerald-400'}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span className="text-xs font-bold text-white">{toast.message}</span>
        </div>
      )}
    </AdminLayout>
  );
};

export default Broadcasts;

