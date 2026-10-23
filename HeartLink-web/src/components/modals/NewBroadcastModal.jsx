import { useState } from "react";
import { X, Send, Megaphone } from "lucide-react";

const NewBroadcastModal = ({ isOpen, onClose, onPublish }) => {
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("Maintenance");
  // Audience is fixed — backend delivers to all active users.
  const targetAudience = "All Registered Accounts";

  // Reset the form each time the modal opens (noticed during render, so there's no extra render pass)
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setTitle("");
      setMsg("");
      setType("Maintenance");
    }
  }

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
      <div className="relative w-full max-w-md bg-ds-canvas max-h-full rounded-2xl shadow-2xl border border-ds-hairline flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden text-ds-ink">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-ds-hairline bg-ds-canvas z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[8px] bg-ds-tint flex items-center justify-center text-ds-on-tint border border-ds-tint shrink-0">
              <Megaphone size={16} />
            </div>
            <div>
              <h3 
                className="text-[17px] font-medium text-ds-ink leading-tight"
              >
                Create Announcement
              </h3>
              <p className="text-[11px] text-ds-steel font-medium mt-0.5">Configure and publish a system-wide announcement</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-ds-slate hover:text-ds-ink p-1.5 rounded-lg hover:bg-ds-surface transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6 flex-1 space-y-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* Title field */}
          <div>
            <label className="block text-[13px] font-medium text-ds-ink mb-1">
              Announcement Title <span className="text-ds-danger">*</span>
            </label>
            <input
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-[13px] bg-ds-canvas border border-ds-hairline-strong text-ds-ink rounded-[8px] focus:outline-none focus:border-ds-line transition-colors placeholder:text-ds-steel"
              placeholder="e.g. Scheduled Maintenance — August 20"
            />
            <div className="flex justify-between mt-1 text-[11px]">
              {title.trim().length > 80 && (
                <p className="font-semibold text-ds-danger">Title must be 80 characters or fewer.</p>
              )}
              <p className={`font-medium ml-auto ${title.trim().length >= 80 ? "text-ds-danger" : "text-ds-steel"}`}>
                {title.trim().length} / 80
              </p>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-medium text-ds-ink mb-1">
              Category
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 text-[12.5px] font-semibold bg-ds-canvas border border-ds-hairline-strong text-ds-ink rounded-[8px] focus:outline-none focus:border-ds-line transition-colors cursor-pointer"
            >
              <option value="Maintenance">Maintenance</option>
              <option value="App Update">App Update</option>
              <option value="Safety Reminder">Safety Reminder</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Message */}
          <div>
            <label className="block text-[13px] font-medium text-ds-ink mb-1">
              Announcement Message <span className="text-ds-danger">*</span>
            </label>
            <textarea
              rows="4"
              maxLength={255}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full px-3.5 py-2 text-[12.5px] bg-ds-canvas border border-ds-hairline-strong text-ds-ink rounded-[8px] focus:outline-none focus:border-ds-line transition-colors resize-none leading-relaxed placeholder:text-ds-steel"
              placeholder="Draft your announcement body (max 255 chars)…"
            />
            <div className="flex justify-end mt-1">
              <p className={`text-[11px] font-medium ${msg.length >= 255 ? "text-ds-danger" : "text-ds-steel"}`}>
                {msg.length} / 255 characters
              </p>
            </div>
          </div>

          {/* Audience — read-only informational */}
          <div className="bg-ds-surface/60 border border-ds-hairline rounded-[8px] px-3.5 py-2.5 flex items-center justify-between text-[12px]">
            <span className="text-[11px] font-semibold text-ds-steel uppercase tracking-wider">Audience</span>
            <span className="font-bold text-ds-ink">All Registered Accounts</span>
          </div>
        </div>

        {/* Footer Action */}
        <div className="px-6 py-4 border-t border-ds-hairline bg-ds-canvas flex shrink-0 gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[8px] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handlePublish}
            disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 text-[12px] font-semibold text-white rounded-[8px] transition-colors bg-ds-primary hover:bg-ds-primary-pressed disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Send size={13} /> <span>Publish announcement</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewBroadcastModal;
