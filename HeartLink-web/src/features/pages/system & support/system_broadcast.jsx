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
  ChevronRight
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import NewBroadcastModal from "../../../components/modals/NewBroadcastModal";
import ViewBroadcastModal from "../../../components/modals/ViewBroadcastModal";

// Mock Data
const initialBroadcasts = [
  {
    id: 1,
    date: "May 28, 2026 10:00 AM",
    publisher: "SYS-02 (Alex R.)",
    message: "System Maintenance: We are performing a quick server optimization. The app may be briefly unavailable.",
    type: "Maintenance"
  },
  {
    id: 2,
    date: "May 24, 2026 08:30 AM",
    publisher: "MED-01 (Dr. Jenkins)",
    message: "Safety Reminder: Ensure your CSS profile is updated if you have experienced any fatigue this week.",
    type: "Safety Reminder"
  }
];

const Broadcasts = () => {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // View Details Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState(null);

  // Pending Broadcast State for Confirmation
  const [pendingBroadcast, setPendingBroadcast] = useState(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => { setIsModalOpen(false); setPendingBroadcast(null); };

  const handlePublishClick = (type, msg, targetAudience) => {
    setPendingBroadcast({ type, message: msg, targetAudience });
    setIsConfirmModalOpen(true);
  };

  const handleConfirmPublish = () => {
    const newRecord = {
      id: Date.now(),
      date: new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      publisher: "SYS-01 (Admin)",
      message: pendingBroadcast.message,
      type: pendingBroadcast.type
    };
    setBroadcasts([newRecord, ...broadcasts]);
    setIsConfirmModalOpen(false);
    closeModal();
  };

  const filteredBroadcasts = broadcasts.filter(b => 
    b.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
    b.publisher.toLowerCase().includes(searchQuery.toLowerCase())
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
              System <span className="text-[#0f172a]">Broadcasts.</span>
            </h2>
          </div>
          <button 
            onClick={openModal}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-sm"
          >
            <Plus size={14} strokeWidth={2.5} /> New Broadcast
          </button>
        </div>

        {/* Main View: History Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden animate-in fade-in duration-300">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Search past announcements..." 
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
                {filteredBroadcasts.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td className="py-4 px-6 align-middle">
                      <span className="text-slate-900 font-bold text-xs">{b.date}</span>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <span className="text-slate-700 font-semibold text-xs">{b.publisher}</span>
                    </td>
                    <td className="py-4 px-6 align-middle">
                      <span className="text-slate-600 text-xs font-medium truncate max-w-[350px] inline-block">{b.message}</span>
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
                ))}
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
      />

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsConfirmModalOpen(false)}></div>
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full relative animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">Confirm Broadcast</h3>
            <p className="text-xs text-slate-600 mb-6 leading-relaxed">
              This message will be pushed to <strong>{pendingBroadcast?.targetAudience || "all users"}</strong> immediately. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 shadow-sm">Cancel</button>
              <button onClick={handleConfirmPublish} className="flex-1 px-4 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"><Send size={14} /> Yes, Send</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Broadcasts;
