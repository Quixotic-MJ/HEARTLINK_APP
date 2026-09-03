import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  MessageSquare,
  UserPlus,
  ShieldAlert,
  Settings,
  CheckCheck,
  Info,
  RotateCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Check,
  Clock,
  Activity,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import AdminLayout from "../../../components/layouts/adminLayout";
import { useAuth } from "../../../contexts/AuthContext";
import { apiFetch } from "../../../api";
import { Skeleton } from "../../../components/ui/Skeleton";

const Notifications = () => {
  const navigate = useNavigate();
  const { user, userId } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [actionError, setActionError] = useState(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unread' | 'read'
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const data = await apiFetch("/api/admin/notifications");
      setNotifications(data.items || []);
      setUnreadCount(data.unread_count || 0);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Mark single item as read
  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    setActionError(null);

    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const isRead = n.read_by?.includes(userId);
          if (!isRead) {
            setUnreadCount((c) => Math.max(0, c - 1));
            return { ...n, read_by: [...(n.read_by || []), userId] };
          }
        }
        return n;
      })
    );

    try {
      await apiFetch(`/api/admin/notifications/${id}/read`, { method: "PUT" });
    } catch (error) {
      console.error("Failed to mark as read:", error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setActionError("Unable to update notification status.");
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setActionError(null);
    const previousNotifications = [...notifications];
    const previousUnreadCount = unreadCount;

    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({
        ...n,
        read_by: [...(n.read_by || []), userId],
      }))
    );

    try {
      await apiFetch("/api/admin/notifications/mark-all-read", { method: "PUT" });
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setActionError("Unable to mark all notifications as read.");
    }
  };

  const handleNavigate = (id, route) => {
    markAsRead(id);
    if (route) {
      navigate(route);
    }
  };

  const getIcon = (type, severity) => {
    switch (type) {
      case "feedback":
        return <MessageSquare size={15} className={severity === "warning" ? "text-[#A9741B]" : "text-[#1B6E63]"} />;
      case "staff":
      case "user":
        return <UserPlus size={15} className={severity === "warning" ? "text-[#E8532E]" : "text-[#1B6E63]"} />;
      case "case":
      case "clinical":
        return <Activity size={15} className="text-[#A93226]" />;
      case "security":
        return <ShieldAlert size={15} className="text-[#A93226]" />;
      case "system":
        return <Settings size={15} className="text-[#5C6B66]" />;
      default:
        return <Info size={15} className="text-[#8B9893]" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "feedback":
        return { label: "Feedback", cls: "bg-[#F6EDDD] text-[#A9741B] border-[#EBD7B8]" };
      case "case":
      case "clinical":
        return { label: "Case Review", cls: "bg-[#F7E4E1] text-[#A93226] border-[#F0C4B8]" };
      case "staff":
      case "user":
        return { label: "Account", cls: "bg-[#E3EFEC] text-[#1B6E63] border-[#C5DFD8]" };
      case "security":
        return { label: "Security", cls: "bg-[#F7E4E1] text-[#A93226] border-[#F0C4B8]" };
      case "system":
        return { label: "System", cls: "bg-[#EDF1EF] text-[#5C6B66] border-[#DCE3DF]" };
      default:
        return { label: "General", cls: "bg-[#EDF1EF] text-[#8B9893] border-[#DCE3DF]" };
    }
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHrs / 24);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHrs < 24) return `${diffHrs}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch (e) {
      return "";
    }
  };

  const formatFullDate = (isoString) => {
    if (!isoString) return "";
    try {
      const d = new Date(isoString);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      return isoString;
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    const isRead = n.read_by?.includes(userId);

    // Status filter
    if (statusFilter === "unread" && isRead) return false;
    if (statusFilter === "read" && !isRead) return false;

    // Type filter
    if (typeFilter !== "all" && n.type !== typeFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const titleMatch = (n.title || "").toLowerCase().includes(q);
      const msgMatch = (n.message || "").toLowerCase().includes(q);
      const typeMatch = (n.type || "").toLowerCase().includes(q);
      if (!titleMatch && !msgMatch && !typeMatch) return false;
    }

    return true;
  });

  // KPI Metrics Calculation
  const totalCount = notifications.length;
  const unreadItemsCount = notifications.filter((n) => !n.read_by?.includes(userId)).length;
  const clinicalCasesCount = notifications.filter((n) => n.type === "case" || n.type === "clinical").length;
  const feedbackTicketsCount = notifications.filter((n) => n.type === "feedback").length;

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;
  const paginatedNotifications = filteredNotifications.slice((page - 1) * pageSize, page * pageSize);

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const isFilterActive = searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  return (
    <AdminLayout>
      <div 
        className="max-w-[1180px] mx-auto text-[#152131] selection:bg-[#E8532E] selection:text-white"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {/* ── PAGE HEAD ── */}
        <div className="flex flex-wrap gap-4 justify-between items-end mb-6">
          <div>
            <span className="block text-[12px] text-[#8B9893] font-medium mb-1 flex items-center gap-1.5">
              <Bell size={13} className="text-[#E8532E]" /> System alerts
            </span>
            <h1 
              className="text-[26px] font-medium tracking-tight text-[#152131] m-0"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Notifications & Alerts Inbox
            </h1>
            <p className="text-[13px] text-[#5C6B66] mt-1.5 max-w-[55ch] leading-[1.5]">
              Real-time feed of clinical escalations, support inquiries, staff events, and system security alerts.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => fetchNotifications()}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-2 text-[12.5px] font-semibold text-[#152131] bg-[#FFFFFF] hover:bg-[#EDF1EF] border border-[#DCE3DF] rounded-[8px] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
              title="Refresh notifications"
            >
              <RotateCw size={13} className={loading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
            {unreadItemsCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 px-4 py-2 text-[12.5px] font-semibold text-white bg-[#E8532E] hover:bg-[#C13E20] rounded-[8px] shadow-2xs transition-colors cursor-pointer"
              >
                <CheckCheck size={14} />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </div>

        {/* ── KPI METRICS ROW ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                Total Alerts
              </p>
              <p 
                className="text-[20px] font-medium text-[#152131] leading-none"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {loading ? "…" : totalCount}
              </p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-[#EDF1EF] border border-[#DCE3DF] flex items-center justify-center text-[#5C6B66]">
              <Bell size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                Unread Items
              </p>
              <p 
                className="text-[20px] font-medium text-[#E8532E] leading-none"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {loading ? "…" : unreadItemsCount}
              </p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-[#FBEAE6] border border-[#F5C7BD] flex items-center justify-center text-[#E8532E]">
              <AlertCircle size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                Clinical Cases
              </p>
              <p 
                className="text-[20px] font-medium text-[#152131] leading-none"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {loading ? "…" : clinicalCasesCount}
              </p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-[#F7E4E1] border border-[#F0C4B8] flex items-center justify-center text-[#A93226]">
              <Activity size={16} />
            </div>
          </div>

          <div className="bg-[#FFFFFF] p-4 rounded-[10px] border border-[#DCE3DF] flex items-center justify-between shadow-2xs">
            <div>
              <p className="text-[10px] font-semibold text-[#8B9893] uppercase tracking-wider mb-1">
                Feedback & Support
              </p>
              <p 
                className="text-[20px] font-medium text-[#152131] leading-none"
                style={{ fontFamily: "'Fraunces', serif" }}
              >
                {loading ? "…" : feedbackTicketsCount}
              </p>
            </div>
            <div className="w-8 h-8 rounded-[8px] bg-[#F6EDDD] border border-[#EBD7B8] flex items-center justify-center text-[#A9741B]">
              <MessageSquare size={16} />
            </div>
          </div>
        </div>

        {/* ── ACTION ERROR BANNER ── */}
        {actionError && (
          <div className="p-3 mb-4 bg-[#F7E4E1] border border-[#F0C4B8] rounded-[8px] flex items-center justify-between text-[#A93226] text-[12px] font-medium">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-[#A93226] font-bold text-xs hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── MAIN CARD: INBOX & FILTERS ── */}
        <div className="bg-[#FFFFFF] rounded-[10px] border border-[#DCE3DF] flex flex-col overflow-hidden shadow-2xs">
          {/* Filter & Search Header Toolbar */}
          <div className="p-4 border-b border-[#DCE3DF] bg-[#FFFFFF] flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B9893] pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search alerts by keyword, title, or message…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-[13px] border border-[#DCE3DF] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors bg-[#EDF1EF] text-[#152131] placeholder:text-[#8B9893]"
              />
            </div>

            {/* Status Pills and Type dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-[#EDF1EF] p-0.5 rounded-[8px] border border-[#DCE3DF] inline-flex">
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[6px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-[#FFFFFF] text-[#152131] shadow-2xs"
                      : "text-[#5C6B66] hover:text-[#152131]"
                  }`}
                >
                  All ({totalCount})
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("unread");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[6px] text-[11.5px] font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === "unread"
                      ? "bg-[#FFFFFF] text-[#E8532E] shadow-2xs"
                      : "text-[#5C6B66] hover:text-[#152131]"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E8532E]" />
                  Unread ({unreadItemsCount})
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("read");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[6px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === "read"
                      ? "bg-[#FFFFFF] text-[#152131] shadow-2xs"
                      : "text-[#5C6B66] hover:text-[#152131]"
                  }`}
                >
                  Read
                </button>
              </div>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-[12px] font-semibold bg-[#FFFFFF] border border-[#DCE3DF] text-[#152131] rounded-[8px] focus:outline-none focus:border-[#152131] transition-colors cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="feedback">Feedback</option>
                <option value="case">Clinical Cases</option>
                <option value="staff">Staff Accounts</option>
                <option value="user">User Accounts</option>
                <option value="security">Security</option>
                <option value="system">System</option>
              </select>

              {isFilterActive && (
                <button
                  onClick={handleClearFilters}
                  className="text-[11px] text-[#A93226] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#F0C4B8] bg-[#F7E4E1] hover:bg-[#F0C4B8] transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* ── NOTIFICATIONS LIST ── */}
          <div className="divide-y divide-[#DCE3DF]">
            {loading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3.5 animate-pulse">
                    <Skeleton className="w-9 h-9 rounded-[8px] bg-[#DCE3DF]/70 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 bg-[#DCE3DF]/70 rounded w-1/3" />
                      <Skeleton className="h-3.5 bg-[#DCE3DF]/70 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-[#F7E4E1] text-[#A93226] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#F0C4B8]">
                  <AlertCircle size={22} />
                </div>
                <h4 
                  className="text-[16px] font-medium text-[#152131] mb-1"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  Unable to load alerts
                </h4>
                <p className="text-[12px] text-[#5C6B66] max-w-sm mx-auto mb-4">
                  Please verify your network connection or try refreshing again.
                </p>
                <button
                  onClick={() => fetchNotifications()}
                  className="px-4 py-2 text-[12px] font-semibold text-white bg-[#E8532E] hover:bg-[#C13E20] rounded-[8px] transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : paginatedNotifications.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-[#EDF1EF] text-[#8B9893] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#DCE3DF]">
                  <Bell size={20} />
                </div>
                <h4 
                  className="text-[16px] font-medium text-[#152131] mb-1"
                  style={{ fontFamily: "'Fraunces', serif" }}
                >
                  No notifications found
                </h4>
                <p className="text-[12px] text-[#5C6B66] max-w-sm mx-auto mb-3">
                  {isFilterActive
                    ? "No alerts match your applied filter or search parameters."
                    : "You are completely caught up with all administrative notifications."}
                </p>
                {isFilterActive && (
                  <button
                    onClick={handleClearFilters}
                    className="px-3.5 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[6px] transition-colors cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              paginatedNotifications.map((n) => {
                const isRead = n.read_by?.includes(userId);
                const badge = getTypeBadge(n.type);

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNavigate(n.id, n.route)}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors group cursor-pointer ${
                      isRead ? "bg-[#FFFFFF] hover:bg-[#EDF1EF]/50 opacity-80" : "bg-[#FBEAE6]/20 hover:bg-[#FBEAE6]/40"
                    }`}
                  >
                    {/* Left Icon + Content */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Unread dot indicator */}
                      <div className="pt-2 flex items-center justify-center shrink-0">
                        {!isRead ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E8532E] ring-2 ring-white shadow-2xs" />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-transparent" />
                        )}
                      </div>

                      {/* Categorical Icon */}
                      <div
                        className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 border ${
                          isRead
                            ? "bg-[#EDF1EF] border-[#DCE3DF]"
                            : "bg-[#FFFFFF] border-[#DCE3DF] shadow-2xs"
                        }`}
                      >
                        {getIcon(n.type, n.severity)}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4
                            className={`text-[13.5px] leading-snug truncate ${
                              isRead ? "font-semibold text-[#152131]" : "font-bold text-[#152131]"
                            }`}
                          >
                            {n.title}
                          </h4>
                          <span
                            className={`inline-flex items-center px-2 py-0.2 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider border ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-[12.5px] text-[#5C6B66] leading-relaxed line-clamp-2 font-medium">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-[#8B9893] font-medium">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock size={11} /> {formatRelativeTime(n.created_at)}
                          </span>
                          <span>•</span>
                          <span>{formatFullDate(n.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div
                      className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#DCE3DF]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {n.route && (
                        <button
                          onClick={() => handleNavigate(n.id, n.route)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[#152131] bg-[#EDF1EF] hover:bg-[#DCE3DF] border border-[#DCE3DF] rounded-[6px] transition-colors cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink size={12} />
                        </button>
                      )}

                      {!isRead ? (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-[#E8532E] hover:text-[#C13E20] bg-[#FBEAE6] hover:bg-[#F5C7BD] border border-[#F5C7BD] rounded-[6px] transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check size={13} />
                          <span>Mark read</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#8B9893] font-medium px-2 py-1">
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── PAGINATION BAR ── */}
          {filteredNotifications.length > 0 && (
            <div className="p-3.5 border-t border-[#DCE3DF] bg-[#FFFFFF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[12px] text-[#5C6B66] font-medium">
                Showing <span className="text-[#152131] font-bold">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredNotifications.length)}</span> of{" "}
                <span className="text-[#152131] font-bold">{filteredNotifications.length}</span> alerts
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-[6px] border border-[#DCE3DF] bg-[#EDF1EF] transition-colors cursor-pointer ${
                    page <= 1 || loading
                      ? "text-[#8B9893] cursor-not-allowed opacity-40"
                      : "text-[#152131] hover:bg-[#DCE3DF]"
                  }`}
                >
                  <ChevronLeft size={13} /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-[6px] border border-[#DCE3DF] bg-[#EDF1EF] transition-colors cursor-pointer ${
                    page >= totalPages || loading
                      ? "text-[#8B9893] cursor-not-allowed opacity-40"
                      : "text-[#152131] hover:bg-[#DCE3DF]"
                  }`}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Notifications;
