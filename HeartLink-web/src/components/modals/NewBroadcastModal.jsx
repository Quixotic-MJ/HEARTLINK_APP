import { useRef, useState } from "react";
import { ChevronDown, Megaphone, Send, Users, X } from "lucide-react";
import { CategoryBadge } from "./ViewBroadcastModal";
import { useDialogFocus } from "../../hooks/useDialogFocus";

const NewBroadcastModal = ({
  isOpen,
  isCovered = false,
  onClose,
  onPublish,
}) => {
  const dialogRef = useRef(null);
  const [title, setTitle] = useState("");
  const [msg, setMsg] = useState("");
  const [type, setType] = useState("Maintenance");
  // Audience is fixed — backend delivers to all active users.
  const targetAudience = "All Registered Accounts";

  useDialogFocus(isOpen && !isCovered, dialogRef, onClose);

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

  const trimmedTitle = title.trim();
  const isTitleValid = trimmedTitle.length > 0 && trimmedTitle.length <= 80;
  const isMsgValid = msg.trim().length > 0;
  const canSubmit = isTitleValid && isMsgValid;

  const handlePublish = (e) => {
    e.preventDefault();
    if (canSubmit) {
      onPublish(type, msg, targetAudience, trimmedTitle);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 font-cal-sans">
      <div
        className="fixed inset-0 bg-cal-ink/40 transition-opacity cursor-pointer"
        onClick={onClose}
      />

      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-broadcast-title"
        tabIndex={-1}
        onSubmit={handlePublish}
        className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas text-cal-ink shadow-[0_12px_36px_rgba(0,0,0,0.12)]"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
              <Megaphone size={16} aria-hidden="true" />
            </span>
            <div>
              <h3
                id="create-broadcast-title"
                className="font-cal-display text-[21px] sm:text-[23px] font-semibold tracking-[-0.5px] leading-[1.2] text-cal-ink"
              >
                Create announcement
              </h3>
              <p className="mt-0.5 text-[12.5px] text-cal-muted">
                Configure and publish a platform-wide announcement.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-muted hover:bg-cal-surface-soft hover:text-cal-ink transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Title field */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="broadcast-title"
                className="text-[13px] font-medium text-cal-ink"
              >
                Announcement title <span className="text-cal-error">*</span>
              </label>
              <span
                className={`font-cal-mono text-[11.5px] tabular-nums ${
                  trimmedTitle.length >= 80
                    ? "font-semibold text-cal-error"
                    : "text-cal-muted"
                }`}
              >
                {trimmedTitle.length} / 80
              </span>
            </div>
            <input
              id="broadcast-title"
              type="text"
              maxLength={80}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 text-[14px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
              placeholder="e.g. Scheduled Maintenance — August 20"
            />
            {trimmedTitle.length > 80 && (
              <p className="mt-1 text-[12px] font-medium text-cal-error">
                Title must be 80 characters or fewer.
              </p>
            )}
          </div>

          {/* Category */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="broadcast-category"
                className="text-[13px] font-medium text-cal-ink"
              >
                Category
              </label>
              <CategoryBadge category={type} />
            </div>
            <div className="relative">
              <select
                id="broadcast-category"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full appearance-none rounded-[8px] border border-cal-hairline bg-cal-canvas pl-3.5 pr-9 text-[14px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none transition-colors cursor-pointer"
              >
                <option value="Maintenance">Maintenance</option>
                <option value="App Update">App Update</option>
                <option value="Safety Reminder">Safety Reminder</option>
                <option value="General">General</option>
              </select>
              <ChevronDown
                size={15}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-cal-muted"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor="broadcast-message"
                className="text-[13px] font-medium text-cal-ink"
              >
                Announcement message <span className="text-cal-error">*</span>
              </label>
              <span
                className={`font-cal-mono text-[11.5px] tabular-nums ${
                  msg.length >= 255
                    ? "font-semibold text-cal-error"
                    : "text-cal-muted"
                }`}
              >
                {msg.length} / 255
              </span>
            </div>
            <textarea
              id="broadcast-message"
              rows="4"
              maxLength={255}
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className="w-full resize-none rounded-[8px] border border-cal-hairline bg-cal-canvas px-3.5 py-2.5 text-[14px] leading-relaxed text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
              placeholder="Draft your announcement body (max 255 characters)…"
            />
          </div>

          {/* Audience — read-only informational */}
          <div className="flex items-center justify-between gap-3 rounded-[10px] border border-cal-hairline bg-cal-surface-soft px-4 py-3 text-[13px]">
            <span className="inline-flex items-center gap-2 font-medium text-cal-muted">
              <Users size={14.5} className="text-cal-muted" aria-hidden="true" />
              <span>Target audience</span>
            </span>
            <span className="font-semibold text-cal-ink">{targetAudience}</span>
          </div>
        </div>

        {/* Footer Action */}
        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-cal-hairline bg-cal-canvas px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer disabled:bg-cal-primary-disabled disabled:text-cal-muted disabled:cursor-not-allowed"
          >
            <Send size={14} />
            <span>Review &amp; publish</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewBroadcastModal;
