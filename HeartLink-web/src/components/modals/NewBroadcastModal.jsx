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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "'Inter', sans-serif" }}>
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-[#FFFFFF] max-h-full rounded-2xl shadow-2xl border border-[#E2E8F0] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-[#0F172A]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#E2E8F0] bg-[#FFFFFF] z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-[#EAF5FC] flex items-center justify-center text-[#2E9AE8] border border-[#CDE1F4] shadow-2xs shrink-0">
              <Megaphone size={16} />
            </div>
            <div>
              <h3 
                className="text-[17px] font-medium text-[#0F172A] leading-tight"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                Create Announcement
              </h3>
              <p className="text-[11px] text-[#94A3B8] font-medium mt-0.5">Configure and publish a system-wide announcement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748B] hover:text-[#0F172A] p-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 flex-1 space-y-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Title field */}
          <div>
            <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Announcement Title <span className="text-[#A93226]">*</span>
            </label>
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-[13px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-[8px] focus:outline-none focus:border-[#0F172A] transition-colors placeholder:text-[#94A3B8]"
              placeholder="e.g. Scheduled Maintenance — August 20"
            />
            <div className="flex justify-between mt-1 text-[11px]">
              {title.trim().length > 80 && (
                <p className="font-semibold text-[#A93226]">Title must be 80 characters or fewer.</p>
              )}
              <p className={`font-medium ml-auto ${title.trim().length >= 80 ? "text-[#A93226]" : "text-[#94A3B8]"}`}>
                {title.trim().length} / 80
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-[12.5px] font-semibold bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-[8px] focus:outline-none focus:border-[#0F172A] transition-colors cursor-pointer"
            >
              <option value="Maintenance">Maintenance</option>
              <option value="App Update">App Update</option>
              <option value="Safety Reminder">Safety Reminder</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Announcement Message <span className="text-[#A93226]">*</span>
            </label>
            <textarea
              rows="4"
              maxLength={255}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full px-3.5 py-2 text-[12.5px] bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] rounded-[8px] focus:outline-none focus:border-[#0F172A] transition-colors resize-none leading-relaxed placeholder:text-[#94A3B8]"
              placeholder="Draft your announcement body (max 255 chars)…"
            />
            <div className="flex justify-end mt-1">
              <p className={`text-[11px] font-medium ${msg.length >= 255 ? "text-[#A93226]" : "text-[#94A3B8]"}`}>
                {msg.length} / 255 characters
              </p>
            </div>
          </div>

          {/* Audience — read-only informational */}
          <div className="bg-[#F8FAFC]/60 border border-[#E2E8F0] rounded-[8px] px-3.5 py-2.5 flex items-center justify-between text-[12px]">
            <span className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">Audience</span>
            <span className="font-bold text-[#0F172A]">All Registered Accounts</span>
          </div>
        </div>

        {/* Footer Action */}
        <div className="px-6 py-4 border-t border-[#E2E8F0] bg-[#FFFFFF] flex shrink-0 gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-[12px] font-semibold text-[#0F172A] bg-[#F8FAFC] hover:bg-[#E2E8F0] border border-[#E2E8F0] rounded-[8px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white rounded-[8px] transition-colors shadow-2xs bg-[#2E9AE8] hover:bg-[#1C7AC8] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={13} /> <span>Publish announcement</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewBroadcastModal;
