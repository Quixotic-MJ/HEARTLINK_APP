import React, { useState, useEffect, useRef, useCallback } from 'react';
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

export default function AdminNotificationDropdown({ userId }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState(null);
  const [actionError, setActionError] = useState(null);

  const isFetchingRef = useRef(false);
  const dropdownRef = useRef(null);

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

  const fetchNotifications = useCallback(async (isExplicitUserAction = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (isExplicitUserAction || notifications.length === 0) {
      setIsLoading(true);
    }

    try {
      const data = await apiFetch("/api/admin/notifications");
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count || 0);
      setFetchError(null);
    } catch (error) {
      console.error("Failed to fetch admin notifications:", error);
      setFetchError("Unable to load notifications.");
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [notifications.length]);

  // Polling with visibility awareness
  useEffect(() => {
    fetchNotifications(true);

    let intervalId = null;

    const startPolling = () => {
      if (!intervalId) {
        intervalId = setInterval(() => {
          if (document.visibilityState === "visible") {
            fetchNotifications(false);
          }
        }, 60000);
      }
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications(false);
        startPolling();
      } else {
        stopPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startPolling();

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopPolling();
    };
  }, [fetchNotifications]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications(false);
    }
  };

  const handleRetry = (e) => {
    if (e) e.stopPropagation();
    setFetchError(null);
    fetchNotifications(true);
  };

  const markAsRead = async (id, route) => {
    setActionError(null);
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    // Optimistically update UI
    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        const isRead = n.read_by?.includes(userId);
        if (!isRead) {
          setUnreadCount(Math.max(0, unreadCount - 1));
          return { ...n, read_by: [...(n.read_by || []), userId] };
        }
      }
      return n;
    }));

    try {
      await apiFetch(`/api/admin/notifications/${id}/read`, { method: "PUT" });
      
      if (route) {
        navigate(route);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setActionError("Unable to mark notification as read.");
    }
  };

  const markAllAsRead = async () => {
    setActionError(null);
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({
      ...n, 
      read_by: [...(n.read_by || []), userId]
    })));

    try {
      await apiFetch("/api/admin/notifications/mark-all-read", { method: "PUT" });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setActionError("Unable to mark notifications as read.");
    }
  };

  const getIcon = (type, severity) => {
    switch(type) {
      case 'feedback': return <MessageSquare size={14} className={severity === 'warning' ? "text-[#A9741B]" : "text-[#1B6E63]"} />;
      case 'staff': return <UserPlus size={14} className={severity === 'warning' ? "text-[#2E9AE8]" : "text-[#1B6E63]"} />;
      case 'security': return <ShieldAlert size={14} className="text-[#A93226]" />;
      case 'system': return <Settings size={14} className="text-[#64748B]" />;
      default: return <Info size={14} className="text-[#94A3B8]" />;
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
        className="relative flex items-center justify-center rounded-[8px] w-[36px] h-[36px] bg-[#FFFFFF] border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:border-[#94A3B8] transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell size={15} strokeWidth={2} className={unreadCount > 0 ? "text-[#2E9AE8]" : ""} />
        {unreadCount > 0 && (
          <span 
            className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-[#2E9AE8] ring-1.5 ring-white"
          />
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 z-50 rounded-[10px] overflow-hidden flex flex-col shadow-xl bg-[#FFFFFF] border border-[#E2E8F0] w-[calc(100vw-2rem)] max-w-[340px] sm:w-[340px] text-[#0F172A]"
          style={{ maxHeight: 480 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#FFFFFF] border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-[#0F172A]">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded bg-[#EAF5FC] text-[#2E9AE8] text-[10px] font-bold">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-medium text-[#2E9AE8] hover:text-[#1C7AC8] transition-colors cursor-pointer"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* Action Error Banner */}
          {actionError && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-[#F7E4E1] border-b border-[#F0C4B8] text-[11px] text-[#A93226] font-medium">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={13} className="text-[#A93226] shrink-0" />
                <span>{actionError}</span>
              </div>
              <button 
                onClick={() => setActionError(null)} 
                className="text-[#A93226] font-bold text-xs cursor-pointer ml-2"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Background Refresh Warning */}
          {fetchError && notifications.length > 0 && (
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#F6EDDD] border-b border-[#EBD7B8] text-[10.5px] text-[#A9741B] font-medium">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={12} className="text-[#A9741B] shrink-0" />
                <span>Unable to refresh latest updates.</span>
              </div>
              <button 
                onClick={handleRetry}
                className="text-[#2E9AE8] hover:text-[#1C7AC8] font-semibold underline ml-2 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* List */}
          <div className="overflow-y-auto flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden" style={{ maxHeight: 380 }}>
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-[#E2E8F0] border-t-[#2E9AE8] rounded-full animate-spin mb-3"></div>
                <p className="text-[11px] text-[#64748B] font-medium">Loading notifications...</p>
              </div>
            ) : fetchError && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 bg-[#F7E4E1] rounded-full flex items-center justify-center mb-2.5 border border-[#F0C4B8] text-[#A93226]">
                  <AlertCircle size={18} />
                </div>
                <p className="text-[12.5px] font-semibold text-[#0F172A]">Unable to load notifications.</p>
                <p className="text-[11px] text-[#64748B] mt-0.5 mb-3">Please check your network connection.</p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2E9AE8] hover:bg-[#1C7AC8] text-white text-[11px] font-medium transition-colors cursor-pointer"
                >
                  <RotateCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 bg-[#F8FAFC] rounded-full flex items-center justify-center mb-2.5 border border-[#E2E8F0]">
                  <Bell size={16} className="text-[#94A3B8]" />
                </div>
                <p className="text-[12.5px] font-medium text-[#0F172A]">You're all caught up!</p>
                <p className="text-[11px] text-[#64748B] mt-0.5">No new notifications right now.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-[#E2E8F0]">
                {notifications.map((n) => {
                  const isRead = n.read_by?.includes(userId);
                  return (
                    <button
                      key={n.id}
                      onClick={() => markAsRead(n.id, n.route)}
                      className={`text-left w-full px-4 py-3 transition-colors hover:bg-[#F8FAFC] flex items-start gap-3 relative cursor-pointer ${isRead ? 'opacity-70 bg-[#FFFFFF]' : 'bg-[#EAF5FC]/30'}`}
                    >
                      {!isRead && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#2E9AE8] rounded-r-full" />}
                      <div className={`mt-0.5 p-1.5 rounded-[7px] shrink-0 ${isRead ? 'bg-[#F8FAFC] border border-[#E2E8F0]' : 'bg-[#FFFFFF] border border-[#E2E8F0] shadow-2xs'}`}>
                        {getIcon(n.type, n.severity)}
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <p className={`text-[12.5px] leading-snug mb-0.5 truncate ${isRead ? 'font-medium text-[#64748B]' : 'font-semibold text-[#0F172A]'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[9.5px] text-[#94A3B8] mt-1 font-medium tracking-wide uppercase">
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
          <div className="px-4 py-2.5 border-t border-[#E2E8F0] bg-[#F8FAFC]/50 flex items-center justify-between text-[11px]">
            <span className="text-[#94A3B8] font-medium">Real-time alerts</span>
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="font-semibold text-[#2E9AE8] hover:text-[#1C7AC8] flex items-center gap-1 transition-colors cursor-pointer"
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
