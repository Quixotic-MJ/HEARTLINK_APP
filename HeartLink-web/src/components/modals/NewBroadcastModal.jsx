import React, { useState, useEffect } from "react";
import { X, Send, Megaphone } from "lucide-react";

const NewBroadcastModal = ({ isOpen, onClose, onPublish }) => {
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("Maintenance");
  // Audience is fixed — backend delivers to all active users.
  const targetAudience = "All Registered Accounts";

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setTitle("");
      setMsg("");
      setType("Maintenance");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isTitleValid = title.trim().length > 0 && title.trim().length <= 80;
  const isMsgValid = msg.trim().length > 0;
  const canSubmit = isTitleValid && isMsgValid;

  const handlePublish = () => {
    if (canSubmit) {
      onPublish(type, msg, targetAudience, title.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity cursor-pointer"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md bg-[#1A1A1A] max-h-full rounded-2xl shadow-2xl border border-white/10 flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-[#161616] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#36272B] flex items-center justify-center text-[#E55F37] border border-[#E55F37]/30 shadow-sm shrink-0">
              <Megaphone size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create Announcement</h3>
              <p className="text-[10px] text-[#89899C] font-medium mt-0.5">Configure and publish a system-wide announcement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 flex-1 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Title field */}
          <div>
            <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-2">
              Announcement Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-[#161616] border border-white/10 text-white rounded-xl focus:outline-none focus:border-[#E55F37] transition-colors placeholder:text-slate-500"
              placeholder="e.g. Scheduled Maintenance — August 20"
            />
            <div className="flex justify-between mt-1.5">
              {title.trim().length > 80 && (
                <p className="text-[10px] font-bold text-rose-400">Title must be 80 characters or fewer.</p>
              )}
              <p className={`text-[10px] font-bold ml-auto ${title.trim().length >= 80 ? "text-rose-400" : "text-slate-500"}`}>
                {title.trim().length} / 80
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-2">
              Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-semibold bg-[#161616] border border-white/10 text-white rounded-xl focus:outline-none focus:border-[#E55F37] transition-colors cursor-pointer"
            >
              <option value="Maintenance" className="bg-[#161616]">Maintenance</option>
              <option value="App Update" className="bg-[#161616]">App Update</option>
              <option value="Safety Reminder" className="bg-[#161616]">Safety Reminder</option>
              <option value="General" className="bg-[#161616]">General</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-[11px] font-bold text-[#89899C] uppercase tracking-wider mb-2">
              Announcement Message <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows="5"
              maxLength={255}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-[#161616] border border-white/10 text-white rounded-xl focus:outline-none focus:border-[#E55F37] transition-colors resize-none leading-relaxed placeholder:text-slate-500"
              placeholder="Draft your announcement body (max 255 chars)..."
            ></textarea>
            <div className="flex justify-end mt-1.5">
              <p className={`text-[10px] font-bold ${msg.length >= 255 ? "text-rose-400" : "text-slate-500"}`}>
                {msg.length} / 255 characters
              </p>
            </div>
          </div>

          {/* Audience — read-only informational */}
          <div className="bg-[#21202E]/40 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[#89899C] uppercase tracking-widest">Audience</span>
            <span className="text-xs font-bold text-white">All Registered Accounts</span>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-5 border-t border-white/10 bg-[#161616] flex shrink-0">
          <button
            onClick={handlePublish}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-white rounded-xl transition-all shadow-sm shadow-[#E55F37]/25 bg-[#E55F37] hover:bg-[#D4542E] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={15} /> Publish Announcement
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewBroadcastModal;


