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
  const [broadcasts] = useState(initialBroadcasts);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  
  // Composer Form State
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("Maintenance");

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => { setIsDrawerOpen(false); setMsg(""); };

  const handlePublishClick = () => {
    if (msg.length > 0) setIsConfirmModalOpen(true);
  };

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 gap-4">
        <div>
          <p className="text-[9px] font-bold text-[#1e4ed8] tracking-[0.2em] uppercase mb-1.5">
            Communication Portal
          </p>
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 leading-[1.1] tracking-tight">
            System <span className="text-[#1e4ed8]">Broadcasts.</span>
          </h2>
        </div>
        <button 
          onClick={openDrawer}
          className="flex items-center gap-1.5 bg-[#1e4ed8] hover:bg-[#113296] text-white font-bold text-[11px] px-3 py-1.5 rounded-lg shadow-sm shadow-blue-900/20 transition-colors"
        >
          <Plus size={14} strokeWidth={2.5} /> New Broadcast
        </button>
      </div>

      {/* Main View: History Log Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 bg-[#f8fafc] flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search past announcements..." className="w-full pl-8 pr-3 py-1.5 text-[11px] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] focus:ring-1 focus:ring-[#1e4ed8]/20 transition-all shadow-sm" />
          </div>
        </div>

        <div className="w-full overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Date Published</th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50">Publisher</th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 w-1/2">Message Preview</th>
                <th className="py-2.5 px-4 text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] border-b border-gray-50 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {broadcasts.map((b) => (
                <tr key={b.id} className="hover:bg-[#f8fafc] transition-colors">
                  <td className="py-3 px-4 text-[11px] font-bold font-mono text-gray-900">{b.date}</td>
                  <td className="py-3 px-4 text-[11px] font-medium text-gray-600">{b.publisher}</td>
                  <td className="py-3 px-4 text-[11px] text-gray-600 truncate max-w-[300px]">{b.message}</td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-[10px] font-bold px-3 py-1.5 rounded-lg border bg-white border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm inline-flex items-center gap-1">
                      View Details <ChevronRight size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-out Drawer: Composer */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={closeDrawer}></div>
          <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-[#f8fafc]">
              <div>
                <h3 className="text-sm font-bold text-gray-900">New Broadcast</h3>
                <p className="text-[10px] text-gray-500">Push to all registered users</p>
              </div>
              <button onClick={closeDrawer} className="text-gray-400 hover:text-gray-900 p-1"><X size={16} /></button>
            </div>

            <div className="p-5 flex-1 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1.5">Category</label>
                <select onChange={(e) => setType(e.target.value)} className="w-full px-3 py-1.5 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg">
                  <option>Maintenance</option>
                  <option>App Update</option>
                  <option>Safety Reminder</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-700 mb-1.5">Broadcast Message</label>
                <textarea 
                  rows="5"
                  maxLength={255}
                  value={msg}
                  onChange={(e) => setMsg(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f8fafc] border border-gray-200 rounded-lg focus:outline-none focus:border-[#1e4ed8] resize-none"
                  placeholder="Draft your announcement (max 255 chars)..."
                ></textarea>
                <p className={`text-[9px] font-bold mt-1 ${msg.length >= 255 ? 'text-red-500' : 'text-gray-400'}`}>{msg.length} / 255 characters</p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 bg-[#f8fafc]">
              <button onClick={handlePublishClick} disabled={!msg} className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm shadow-red-900/20 transition-colors disabled:opacity-50">
                <Send size={14} /> Publish Broadcast Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setIsConfirmModalOpen(false)}></div>
          <div className="bg-white p-6 rounded-2xl shadow-xl max-w-xs w-full relative">
            <AlertTriangle className="text-red-500 mb-4" size={32} />
            <h3 className="text-sm font-bold text-gray-900 mb-2">Confirm Broadcast</h3>
            <p className="text-[11px] text-gray-600 mb-6 leading-relaxed">
              This message will be pushed to <strong>all</strong> users' smartphones immediately. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setIsConfirmModalOpen(false)} className="flex-1 px-4 py-2 text-[11px] font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">Cancel</button>
              <button onClick={() => { setIsConfirmModalOpen(false); closeDrawer(); }} className="flex-1 px-4 py-2 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors">Yes, Send</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default Broadcasts;