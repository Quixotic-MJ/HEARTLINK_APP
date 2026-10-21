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
import { UI, FONTS, PageHeader, KpiCard } from "../../../styles/designSystem";

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
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unread' | 'read' | 'archived'
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      // HL-019: archived ones (over 72 hours old) come too, but only show under "Archived".
      const data = await apiFetch("/api/admin/notifications?include_archived=true");
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
        return <MessageSquare size={15} className={severity === "warning" ? "text-ds-warm-text" : "text-ds-charcoal"} />;
      case "staff":
      case "user":
        return <UserPlus size={15} className={severity === "warning" ? "text-ds-primary" : "text-ds-charcoal"} />;
      case "case":
      case "clinical":
        return <Activity size={15} className="text-ds-danger" />;
      case "security":
        return <ShieldAlert size={15} className="text-ds-danger" />;
      case "system":
        return <Settings size={15} className="text-ds-slate" />;
      default:
        return <Info size={15} className="text-ds-steel" />;
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "feedback":
        return { label: "Feedback", cls: "bg-ds-yellow text-ds-warm-text border-ds-yellow-bold" };
      case "case":
      case "clinical":
        return { label: "Case Review", cls: "bg-ds-rose text-ds-ink border-ds-rose" };
      case "staff":
      case "user":
        return { label: "Account", cls: "bg-ds-mint text-ds-charcoal border-ds-mint" };
      case "security":
        return { label: "Security", cls: "bg-ds-rose text-ds-ink border-ds-rose" };
      case "system":
        return { label: "System", cls: "bg-ds-surface text-ds-slate border-ds-hairline" };
      default:
        return { label: "General", cls: "bg-ds-surface text-ds-steel border-ds-hairline" };
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

    // Status filter: archived notifications only show under "Archived"
    if ((statusFilter === "archived") !== !!n.archived) return false;
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
  const activeNotifications = notifications.filter((n) => !n.archived);
  const archivedCount = notifications.length - activeNotifications.length;
  const totalCount = activeNotifications.length;
  const unreadItemsCount = activeNotifications.filter((n) => !n.read_by?.includes(userId)).length;
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
      <div className={UI.page.container} style={{ fontFamily: FONTS.sans }}>
        {/* ── PAGE HEAD ── */}
        <PageHeader
          eyebrow="System alerts"
          eyebrowIcon={Bell}
          title="Notifications & Alerts Inbox"
          description="Real-time feed of clinical escalations, support inquiries, staff events, and system security alerts."
          actions={
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => fetchNotifications()}
                disabled={loading}
                className={UI.button.secondary}
                title="Refresh notifications"
              >
                <RotateCw size={13} className={loading ? "animate-spin" : ""} />
                <span>Refresh</span>
              </button>
              {unreadItemsCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className={UI.button.primary}
                >
                  <CheckCheck size={14} />
                  <span>Mark all as read</span>
                </button>
              )}
            </div>
          }
        />

        {/* ── KPI METRICS ROW ── */}
        <div className={UI.kpi.grid}>
          <KpiCard
            label="Total Alerts"
            value={loading ? "…" : totalCount}
            icon={Bell}
          />
          <KpiCard
            label="Unread Items"
            value={loading ? "…" : unreadItemsCount}
            icon={AlertCircle}
            iconBg="bg-ds-tint"
            iconColor="text-ds-primary"
            iconBorder="border-ds-tint"
            valueColor="text-ds-primary"
          />
          <KpiCard
            label="Clinical Cases"
            value={loading ? "…" : clinicalCasesCount}
            icon={Activity}
            iconBg="bg-ds-rose"
            iconColor="text-ds-danger"
            iconBorder="border-ds-rose"
            valueColor="text-ds-danger"
          />
          <KpiCard
            label="Feedback & Support"
            value={loading ? "…" : feedbackTicketsCount}
            icon={MessageSquare}
            iconBg="bg-ds-yellow"
            iconColor="text-ds-warm-text"
            iconBorder="border-ds-yellow-bold"
          />
        </div>

        {/* ── ACTION ERROR BANNER ── */}
        {actionError && (
          <div className="p-3 mb-4 bg-ds-rose border border-ds-rose rounded-[8px] flex items-center justify-between text-ds-ink text-[12px] font-medium">
            <span>{actionError}</span>
            <button
              onClick={() => setActionError(null)}
              className="text-ds-danger font-bold text-xs hover:underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── MAIN CARD: INBOX & FILTERS ── */}
        <div className="bg-ds-canvas rounded-xl border border-ds-hairline flex flex-col overflow-hidden ">
          {/* Filter & Search Header Toolbar */}
          <div className="p-4 border-b border-ds-hairline bg-ds-canvas flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Search input */}
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ds-steel pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search alerts by keyword, title, or message…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 text-[13px] border border-ds-hairline rounded-[8px] focus:outline-none focus:border-ds-ink transition-colors bg-ds-surface text-ds-ink placeholder:text-ds-steel"
              />
            </div>

            {/* Status Pills and Type dropdown */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-ds-surface p-0.5 rounded-[8px] border border-ds-hairline inline-flex">
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[6px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === "all"
                      ? "bg-ds-canvas text-ds-ink "
                      : "text-ds-slate hover:text-ds-ink"
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
                      ? "bg-ds-canvas text-ds-primary "
                      : "text-ds-slate hover:text-ds-ink"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-ds-primary" />
                  Unread ({unreadItemsCount})
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("read");
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-[6px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === "read"
                      ? "bg-ds-canvas text-ds-ink "
                      : "text-ds-slate hover:text-ds-ink"
                  }`}
                >
                  Read
                </button>
                <button
                  onClick={() => {
                    setStatusFilter("archived");
                    setPage(1);
                  }}
                  title="Notifications archive 72 hours after they're sent"
                  className={`px-3 py-1 rounded-[6px] text-[11.5px] font-semibold transition-colors cursor-pointer ${
                    statusFilter === "archived"
                      ? "bg-ds-canvas text-ds-ink "
                      : "text-ds-slate hover:text-ds-ink"
                  }`}
                >
                  Archived ({archivedCount})
                </button>
              </div>

              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-[12px] font-semibold bg-ds-canvas border border-ds-hairline text-ds-ink rounded-[8px] focus:outline-none focus:border-ds-ink transition-colors cursor-pointer"
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
                  className="text-[11px] text-ds-ink font-semibold px-2.5 py-1.5 rounded-[6px] border border-ds-rose bg-ds-rose hover:bg-ds-rose transition-colors cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* ── NOTIFICATIONS LIST ── */}
          <div className="divide-y divide-ds-hairline">
            {loading ? (
              <div className="p-8 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3.5 animate-pulse">
                    <Skeleton className="w-9 h-9 rounded-[8px] bg-ds-hairline/70 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 bg-ds-hairline/70 rounded w-1/3" />
                      <Skeleton className="h-3.5 bg-ds-hairline/70 rounded w-3/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fetchError ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-ds-rose text-ds-ink rounded-full flex items-center justify-center mx-auto mb-3 border border-ds-rose">
                  <AlertCircle size={22} />
                </div>
                <h4 className="text-[16px] font-semibold text-ds-ink mb-1">
                  Unable to load alerts
                </h4>
                <p className="text-[12px] text-ds-slate max-w-sm mx-auto mb-4">
                  Please verify your network connection or try refreshing again.
                </p>
                <button
                  onClick={() => fetchNotifications()}
                  className="px-4 py-2 text-[12px] font-semibold text-white bg-ds-primary hover:bg-ds-primary-pressed rounded-[8px] transition-colors cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            ) : paginatedNotifications.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 bg-ds-surface text-ds-steel rounded-full flex items-center justify-center mx-auto mb-3 border border-ds-hairline">
                  <Bell size={20} />
                </div>
                <h4 className="text-[16px] font-semibold text-ds-ink mb-1">
                  No notifications found
                </h4>
                <p className="text-[12px] text-ds-slate max-w-sm mx-auto mb-3">
                  {isFilterActive
                    ? "No alerts match your applied filter or search parameters."
                    : "You are completely caught up with all administrative notifications."}
                </p>
                {isFilterActive && (
                  <button
                    onClick={handleClearFilters}
                    className="px-3.5 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[6px] transition-colors cursor-pointer"
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
                      // HL-042: unread grey, read white (the blue dot still marks unread)
                      isRead ? "bg-ds-canvas hover:bg-ds-surface" : "bg-ds-surface-alt hover:bg-ds-hairline"
                    }`}
                  >
                    {/* Left Icon + Content */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Unread dot indicator */}
                      <div className="pt-2 flex items-center justify-center shrink-0">
                        {!isRead ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-ds-primary ring-2 ring-white " />
                        ) : (
                          <span className="w-2.5 h-2.5 rounded-full bg-transparent" />
                        )}
                      </div>

                      {/* Categorical Icon */}
                      <div
                        className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 border ${
                          isRead
                            ? "bg-ds-surface border-ds-hairline"
                            : "bg-ds-canvas border-ds-hairline "
                        }`}
                      >
                        {getIcon(n.type, n.severity)}
                      </div>

                      {/* Text content */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4
                            className={`text-[13.5px] leading-snug truncate ${
                              isRead ? "font-semibold text-ds-ink" : "font-bold text-ds-ink"
                            }`}
                          >
                            {n.title}
                          </h4>
                          <span
                            className={`inline-flex items-center px-2 py-0.2 rounded-[4px] text-[11px] font-bold uppercase tracking-wider border ${badge.cls}`}
                          >
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-[12.5px] text-ds-slate leading-relaxed line-clamp-2 font-medium">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-ds-steel font-medium">
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> {formatRelativeTime(n.created_at)}
                          </span>
                          <span>•</span>
                          <span>{formatFullDate(n.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div
                      className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-ds-hairline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {n.route && (
                        <button
                          onClick={() => handleNavigate(n.id, n.route)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-ds-ink bg-ds-surface hover:bg-ds-hairline border border-ds-hairline rounded-[6px] transition-colors cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink size={12} />
                        </button>
                      )}

                      {!isRead ? (
                        <button
                          onClick={(e) => markAsRead(n.id, e)}
                          className="flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold text-ds-on-tint hover:text-ds-primary-pressed bg-ds-tint hover:bg-ds-tint border border-ds-tint rounded-[6px] transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check size={13} />
                          <span>Mark read</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-ds-steel font-medium px-2 py-1">
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
            <div className="p-3.5 border-t border-ds-hairline bg-ds-canvas flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-[12px] text-ds-slate font-medium">
                Showing <span className="text-ds-ink font-bold">{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredNotifications.length)}</span> of{" "}
                <span className="text-ds-ink font-bold">{filteredNotifications.length}</span> alerts
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-[6px] border border-ds-hairline bg-ds-surface transition-colors cursor-pointer ${
                    page <= 1 || loading
                      ? "text-ds-steel cursor-not-allowed opacity-40"
                      : "text-ds-ink hover:bg-ds-hairline"
                  }`}
                >
                  <ChevronLeft size={13} /> Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className={`flex items-center gap-1 px-3 py-1.5 text-[12px] font-semibold rounded-[6px] border border-ds-hairline bg-ds-surface transition-colors cursor-pointer ${
                    page >= totalPages || loading
                      ? "text-ds-steel cursor-not-allowed opacity-40"
                      : "text-ds-ink hover:bg-ds-hairline"
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
