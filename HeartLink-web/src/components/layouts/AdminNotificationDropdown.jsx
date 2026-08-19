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
  AlertCircle
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
    // Initial fetch
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

    startPolling();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchNotifications]);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    setActionError(null);
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
      // Rollback optimistic state
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setActionError("Unable to mark notification as read.");
    }
  };

  const markAllAsRead = async () => {
    setActionError(null);
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    // Optimistically update UI
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({
      ...n, 
      read_by: [...(n.read_by || []), userId]
    })));

    try {
      await apiFetch("/api/admin/notifications/mark-all-read", { method: "PUT" });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      // Rollback optimistic state
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setActionError("Unable to mark notifications as read.");
    }
  };

  const getIcon = (type, severity) => {
    switch(type) {
      case 'feedback': return <MessageSquare size={15} className={severity === 'warning' ? "text-amber-500" : "text-blue-500"} />;
      case 'staff': return <UserPlus size={15} className={severity === 'warning' ? "text-orange-500" : "text-emerald-500"} />;
      case 'security': return <ShieldAlert size={15} className="text-red-500" />;
      case 'system': return <Settings size={15} className="text-slate-500" />;
      default: return <Info size={15} className="text-slate-400" />;
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
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggle}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative flex items-center justify-center rounded-xl transition-all ml-2"
        style={{
          width: 36, height: 36,
          backgroundColor: isOpen ? "rgba(15,23,42,0.06)" : "#f8fafc",
          border: "1px solid",
          borderColor: isOpen ? "rgba(15,23,42,0.12)" : "rgba(15,23,42,0.08)",
          color: "rgba(15,23,42,0.7)",
        }}
        title="Notifications"
      >
        <Bell size={16} strokeWidth={2} className={unreadCount > 0 ? "animate-pulse" : ""} />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 z-50 rounded-2xl overflow-hidden flex flex-col shadow-2xl bg-white border border-slate-200/60 w-[calc(100vw-2rem)] max-w-[340px] sm:w-[340px]"
          style={{ maxHeight: 480, animation: "fadeIn 0.15s ease-out" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-b border-slate-100 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-slate-800">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px] font-bold tracking-wide">
                  {unreadCount} NEW
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
          </div>

          {/* Action Error Banner (e.g. mark-as-read failure) */}
          {actionError && (
            <div className="flex items-center justify-between px-3.5 py-2 bg-red-50/90 border-b border-red-100 text-[11px] text-red-700 font-medium">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={13} className="text-red-500 flex-shrink-0" />
                <span>{actionError}</span>
              </div>
              <button 
                onClick={() => setActionError(null)} 
                className="text-red-500 hover:text-red-800 ml-2 font-bold text-xs"
                aria-label="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Background Refresh Warning (if notifications are present but refresh failed) */}
          {fetchError && notifications.length > 0 && (
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-amber-50/90 border-b border-amber-100 text-[10.5px] text-amber-800 font-medium">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={12} className="text-amber-500 flex-shrink-0" />
                <span>Unable to refresh latest updates.</span>
              </div>
              <button 
                onClick={handleRetry}
                className="text-blue-600 hover:text-blue-800 font-semibold underline ml-2"
              >
                Retry
              </button>
            </div>
          )}

          {/* List */}
          <div className="overflow-y-auto flex-1 scrollbar-hide" style={{ maxHeight: 380 }}>
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-3"></div>
                <p className="text-[11px] text-slate-400 font-medium">Loading notifications...</p>
              </div>
            ) : fetchError && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mb-2.5 border border-red-100 text-red-500">
                  <AlertCircle size={18} />
                </div>
                <p className="text-[12.5px] font-semibold text-slate-700">Unable to load notifications.</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Please check your network connection.</p>
                <button
                  onClick={handleRetry}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium shadow-sm hover:bg-slate-800 transition-colors"
                >
                  <RotateCw size={12} />
                  <span>Retry</span>
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                  <Bell size={18} className="text-slate-300" />
                </div>
                <p className="text-[13px] font-medium text-slate-600">You're all caught up!</p>
                <p className="text-[11px] text-slate-400 mt-1">No new notifications right now.</p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-50/50">
                {notifications.map((n) => {
                  const isRead = n.read_by?.includes(userId);
                  return (
                    <button
                      key={n.id}
                      onClick={() => markAsRead(n.id, n.route)}
                      className={`text-left w-full px-4 py-3 transition-colors hover:bg-slate-50 flex items-start gap-3.5 relative ${isRead ? 'opacity-75' : 'bg-blue-50/20'}`}
                    >
                      {!isRead && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full" />}
                      <div className={`mt-0.5 p-2 rounded-xl flex-shrink-0 ${isRead ? 'bg-slate-50 border border-slate-100' : 'bg-white shadow-sm border border-slate-200'}`}>
                        {getIcon(n.type, n.severity)}
                      </div>
                      <div className="flex-1 min-w-0 pr-1">
                        <p className={`text-[12.5px] leading-snug mb-0.5 truncate ${isRead ? 'font-medium text-slate-600' : 'font-semibold text-slate-900'}`}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>
                        <p className="text-[9.5px] text-slate-400 mt-1.5 font-medium tracking-wide uppercase">
                          {formatTime(n.created_at)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Minimal Neutral Footer */}
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50/80 text-[11px] text-slate-400 font-medium text-center">
            Admin notifications
          </div>
        </div>
      )}
    </div>
  );
}
