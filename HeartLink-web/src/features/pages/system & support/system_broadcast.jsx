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
  CheckCircle2
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
      <div className="flex flex-col h-full bg-slate-50/50">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1.5">
              Communication Portal
            </p>
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-[1.1] tracking-tight">
              System <span className="text-[#0f172a]">Announcements.</span>
            </h2>
          </div>
          <button 
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={14} strokeWidth={2.5} /> Create Announcement
          </button>
        </div>

        {/* Main View: History Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search announcements..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 shadow-sm" 
              />
            </div>
          </div>

          <div className="w-full overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr>
                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Date Published</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100">Publisher</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 w-1/2">Message Preview</th>
                  <th className="py-4 px-6 text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center">
                      <div className="flex justify-center items-center gap-2 text-slate-400">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-xs font-medium">Loading announcements...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBroadcasts.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-slate-500 text-xs">
                      No announcements found.
                    </td>
                  </tr>
                ) : (
                  filteredBroadcasts.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                      <td className="py-4 px-6 align-middle">
                        <span className="text-slate-900 font-bold text-xs">{b.date}</span>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <span className="text-slate-700 font-semibold text-xs">
                          {b.display_publisher || (b.publisher ? b.publisher.replace(/^[^(]+\((.+)\)$/, "$1") : "System Admin")}
                        </span>
                      </td>
                      <td className="py-4 px-6 align-middle">
                        <div className="space-y-1.5 max-w-[420px]">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-900 text-xs font-bold truncate">
                              {b.title || "Announcement"}
                            </span>
                            {getCategoryBadge(b.type)}
                          </div>
                          <p className="text-slate-500 text-xs font-medium truncate">{b.message}</p>
                        </div>
                      </td>
                      <td className="py-4 px-6 align-middle text-right">
                        <button 
                          onClick={() => { setActiveBroadcast(b); setViewModalOpen(true); }}
                          className="text-[10px] font-bold px-4 py-2 rounded-xl border bg-white border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors shadow-sm inline-flex items-center gap-1.5 whitespace-nowrap"
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
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsConfirmModalOpen(false)}></div>
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-md w-full relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Announcement</h3>
                <p className="text-[11px] text-slate-500 font-medium">Review details before publishing to all users</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar py-2">
              {/* Title & Category */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Title</span>
                  {getCategoryBadge(pendingBroadcast?.type)}
                </div>
                <p className="text-xs font-bold text-slate-900">{pendingBroadcast?.title || "Untitled Announcement"}</p>
              </div>

              {/* Audience */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audience</span>
                <span className="font-semibold text-slate-800">{pendingBroadcast?.targetAudience || "All Registered Accounts"}</span>
              </div>

              {/* Message Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Message Preview</span>
                <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 max-h-36 overflow-y-auto custom-scrollbar">
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap select-text">
                    {pendingBroadcast?.message}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                This message will be published to <strong>{pendingBroadcast?.targetAudience || "all users"}</strong> immediately. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-3 pt-3 border-t border-slate-100 mt-2">
              <button 
                disabled={isSubmitting} 
                onClick={() => setIsConfirmModalOpen(false)} 
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                disabled={isSubmitting} 
                onClick={handleConfirmPublish} 
                className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
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
        <div className={`fixed bottom-6 right-6 z-[70] px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span className="text-xs font-medium">{toast.message}</span>
        </div>
      )}
    </AdminLayout>
  );
};

export default Broadcasts;
