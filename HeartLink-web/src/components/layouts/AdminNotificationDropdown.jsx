import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  MessageSquare, 
  UserPlus, 
  ShieldAlert, 
  Settings, 
  CheckCheck,
  Info
} from 'lucide-react';
import { apiFetch } from '../../api';

export default function AdminNotificationDropdown({ userId }) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
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

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const data = await apiFetch("/api/admin/notifications");
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch admin notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchNotifications();
    // Poll every 60 seconds
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      fetchNotifications();
    }
  };

  const markAsRead = async (id, route) => {
    try {
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

      await apiFetch(`/api/admin/notifications/${id}/read`, { method: "PUT" });
      
      if (route) {
        navigate(route);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({
        ...n, 
        read_by: [...(n.read_by || []), userId]
      })));
      await apiFetch("/api/admin/notifications/mark-all-read", { method: "PUT" });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
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
          className="absolute right-0 mt-2 z-50 rounded-2xl overflow-hidden flex flex-col shadow-2xl bg-white border border-slate-200/60"
          style={{ width: 340, maxHeight: 480, animation: "fadeIn 0.15s ease-out" }}
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

          {/* List */}
          <div className="overflow-y-auto flex-1 scrollbar-hide" style={{ maxHeight: 380 }}>
            {isLoading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10">
                <div className="w-5 h-5 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-3"></div>
                <p className="text-[11px] text-slate-400 font-medium">Loading notifications...</p>
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
        </div>
      )}
    </div>
  );
}
