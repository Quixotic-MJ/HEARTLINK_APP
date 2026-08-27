import React, { useState, useEffect } from "react";
import { X, Send } from "lucide-react";

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
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>
      <div className="relative w-full max-w-md bg-slate-50 max-h-full rounded-2xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 bg-white shadow-sm z-10">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Create Announcement</h3>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Configure and publish a system-wide announcement</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 flex-1 space-y-5 overflow-y-auto custom-scrollbar">
          {/* Title field */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-2">
              Announcement Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors shadow-sm"
              placeholder="e.g. Scheduled Maintenance — August 20"
            />
            <div className="flex justify-between mt-1.5">
              {title.trim().length > 80 && (
                <p className="text-[10px] font-bold text-red-500">Title must be 80 characters or fewer.</p>
              )}
              <p className={`text-[10px] font-bold ml-auto ${title.trim().length >= 80 ? "text-red-500" : "text-slate-400"}`}>
                {title.trim().length} / 80
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-2">
              Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-4 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors shadow-sm cursor-pointer text-slate-800"
            >
              <option value="Maintenance">Maintenance</option>
              <option value="App Update">App Update</option>
              <option value="Safety Reminder">Safety Reminder</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-2">
              Announcement Message <span className="text-red-500">*</span>
            </label>
            <textarea
              rows="5"
              maxLength={255}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full px-4 py-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-900/5 transition-colors resize-none leading-relaxed shadow-sm"
              placeholder="Draft your announcement body (max 255 chars)..."
            ></textarea>
            <div className="flex justify-end mt-1.5">
              <p className={`text-[10px] font-bold ${msg.length >= 255 ? "text-red-500" : "text-slate-400"}`}>
                {msg.length} / 255 characters
              </p>
            </div>
          </div>

          {/* Audience — read-only informational */}
          <div className="bg-slate-100/60 border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Audience</span>
            <span className="text-xs font-bold text-slate-800 ml-auto">All Registered Accounts</span>
          </div>
        </div>

        {/* Footer Action */}
        <div className="p-5 border-t border-slate-200 bg-slate-50 flex shrink-0">
          <button
            onClick={handlePublish}
            disabled={!canSubmit}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 text-xs font-bold text-white rounded-xl transition-all shadow-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={15} /> Publish Announcement
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewBroadcastModal;

