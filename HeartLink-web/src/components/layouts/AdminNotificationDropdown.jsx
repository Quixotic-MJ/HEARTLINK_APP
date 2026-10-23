import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  MessageSquare, 
  UserPlus, 
  ShieldAlert, 
  Settings, 
  CheckCheck,
  Info,
  RotateCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { apiFetch } from '../../api';
import { useApiQuery } from '../../hooks/useApiQuery';
import { markNotificationsRead } from '../../utils/notificationCache';

const BELL_PATH = "/api/admin/notifications";
const BELL_KEY = ["api", BELL_PATH];
const NO_NOTIFICATIONS = [];

export default function AdminNotificationDropdown({ userId }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  const dropdownRef = useRef(null);

  // Checks every 60 seconds while the tab is open (paused while it's hidden), when the tab gets focus, when the
  // bell is opened, and after any save
  const queryClient = useQueryClient();
  const notificationsQuery = useApiQuery(BELL_PATH, { refetchInterval: 60 * 1000 });
  const notifications = notificationsQuery.data?.items ?? NO_NOTIFICATIONS;
  const unreadCount = notificationsQuery.data?.unread_count || 0;
  const isLoading = notificationsQuery.isPending;
  const fetchError = notificationsQuery.isError ? "Unable to load notifications." : null;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard accessibility: Escape to close dropdown
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);


  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      notificationsQuery.refetch();
    }
  };

  const handleRetry = (e) => {
    if (e) e.stopPropagation();
    notificationsQuery.refetch();
  };

  const markAsRead = async (id, route) => {
    setActionError(null);
    const undo = markNotificationsRead(queryClient, BELL_KEY, userId, (n) => n.id === id);

    try {
      await apiFetch(`/api/admin/notifications/${id}/read`, { method: "PUT" });
      
      if (route) {
        navigate(route);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
      undo();
      setActionError("Unable to mark notification as read.");
    }
  };

  const markAllAsRead = async () => {
    setActionError(null);
    const undo = markNotificationsRead(queryClient, BELL_KEY, userId, () => true, true);

    try {
      await apiFetch("/api/admin/notifications/mark-all-read", { method: "PUT" });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      undo();
      setActionError("Unable to mark notifications as read.");
    }
  };

  const getIcon = (type, severity) => {
    switch(type) {
      case 'feedback': return <MessageSquare size={14} className={severity === 'warning' ? "text-ds-warm-text" : "text-ds-charcoal"} />;
      case 'staff': return <UserPlus size={14} className={severity === 'warning' ? "text-ds-primary" : "text-ds-charcoal"} />;
      case 'security': return <ShieldAlert size={14} className="text-ds-danger" />;
      case 'system': return <Settings size={14} className="text-ds-slate" />;
      default: return <Info size={14} className="text-ds-steel" />;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return "";
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef} style={{ fontFamily: "'Inter', sans-serif" }}>
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative flex items-center justify-center rounded-[8px] w-[36px] h-[36px] bg-ds-canvas border border-ds-hairline text-ds-slate hover:text-ds-ink hover:border-ds-steel transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell size={15} strokeWidth={2} className={unreadCount > 0 ? "text-ds-primary" : ""} />
        {unreadCount > 0 && (
          <span 
            className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-ds-primary ring-1.5 ring-white"
          />
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 z-50 rounded-xl overflow-hidden flex flex-col shadow-xl bg-ds-canvas border border-ds-hairline w-[calc(100vw-2rem)] max-w-[340px] sm:w-[340px] text-ds-ink"
          style={{ maxHeight: 480 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-ds-canvas border-b border-ds-hairline">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-ds-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-ds-tint text-ds-on-tint text-[11px] font-bold">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-medium text-ds-primary hover:text-ds-primary-pressed transition-colors cursor-pointer"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* Action Error Banner */}
          {actionError && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-ds-rose border-b border-ds-rose text-[11px] text-ds-ink font-medium">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={13} className="text-ds-danger shrink-0" />
                <span>{actionError}</span>
              </div>
              <button 
                onClick={() => setActionError(null)} 
                className="text-ds-danger font-bold text-xs cursor-pointer ml-2"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Background Refresh Warning */}
          {fetchError && notifications.length > 0 && (
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-ds-yellow border-b border-ds-yellow-bold text-[11px] text-ds-warm-text font-medium">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={12} className="text-ds-warm-text shrink-0" />
                <span>Unable to refresh latest updates.</span>
              </div>
              <button 
                onClick={handleRetry}
                className="text-ds-primary hover:text-ds-primary-pressed font-semibold underline ml-2 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* List */}
          <div className="overflow-y-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ maxHeight: 380 }}>
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-ds-hairline border-t-ds-line rounded-full animate-spin mb-3"></div>
                <p className="text-[11px] text-ds-slate font-medium">Loading notifications...</p>
              </div>
            ) : fetchError && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 bg-ds-rose rounded-full flex items-center justify-center mb-2.5 border border-ds-rose text-ds-ink">
                  <AlertCircle size={18} />
                </div>
                <p className="text-[12.5px] font-semibold text-ds-ink">Unable to load notifications.</p>
                <p className="text-[11px] text-ds-slate mt-0.5 mb-3">Please check your network connection.</p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ds-primary hover:bg-ds-primary-pressed text-white text-[11px] font-medium transition-colors cursor-pointer"
                >
                  <RotateCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 bg-ds-surface rounded-full flex items-center justify-center mb-2.5 border border-ds-hairline">
                  <Bell size={16} className="text-ds-steel" />
                </div>
                <p className="text-[12.5px] font-medium text-ds-ink">You're all caught up!</p>
                <p className="text-[11px] text-ds-slate mt-0.5">No new notifications right now.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-ds-hairline">
                {notifications.map((n) => {
                  const isRead = n.read_by?.includes(userId);
                  return (
                    <button
                      key={n.id}
                      onClick={() => markAsRead(n.id, n.route)}
                      className={`text-left w-full px-4 py-3 transition-colors flex items-start gap-3 relative cursor-pointer ${isRead ? 'bg-ds-canvas hover:bg-ds-surface' : 'bg-ds-surface-alt hover:bg-ds-hairline'}`}
                    >
                      {!isRead && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-ds-primary rounded-r-full" />}
                      <div className={`mt-0.5 p-1.5 rounded-[7px] shrink-0 ${isRead ? 'bg-ds-surface border border-ds-hairline' : 'bg-ds-canvas border border-ds-hairline '}`}>
                        {getIcon(n.type, n.severity)}
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <p className={`text-[12.5px] leading-snug mb-0.5 truncate ${isRead ? 'font-medium text-ds-slate' : 'font-semibold text-ds-ink'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-ds-slate line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[11px] text-ds-steel mt-1 font-medium tracking-wide uppercase">
                          {formatTime(n.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action: Jump to full inbox */}
          <div className="px-4 py-2.5 border-t border-ds-hairline bg-ds-surface/50 flex items-center justify-between text-[11px]">
            <span className="text-ds-steel font-medium">Real-time alerts</span>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="font-semibold text-ds-primary hover:text-ds-primary-pressed flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View full inbox</span>
              <ExternalLink size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
