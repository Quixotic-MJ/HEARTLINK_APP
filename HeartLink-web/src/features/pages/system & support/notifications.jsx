import { useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Info,
  MessageSquare,
  RotateCw,
  Search,
  Settings as SettingsIcon,
  ShieldAlert,
  StickyNote,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "../../../components/layouts/adminLayout";
import { useAuth } from "../../../contexts/useAuth";
import { apiFetch } from "../../../api";
import { useApiQuery } from "../../../hooks/useApiQuery";
import { markNotificationsRead } from "../../../utils/notificationCache";
import LoadError from "../../../components/ui/LoadError";
import { Skeleton } from "../../../components/ui/Skeleton";

const NOTIFICATIONS_PATH = "/api/admin/notifications?include_archived=true";
const NOTIFICATIONS_KEY = ["api", NOTIFICATIONS_PATH];
const NO_NOTIFICATIONS = [];

const PILL =
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold leading-none whitespace-nowrap";

const getNotificationBadge = (type) => {
  switch (type) {
    case "feedback":
      return {
        label: "Feedback",
        className: "border-cal-warning/35 bg-cal-warning/15 text-cal-ink",
      };
    case "case":
    case "clinical":
      return {
        label: "Case review",
        className: "border-cal-error/25 bg-cal-error/10 text-cal-ink",
      };
    case "staff":
    case "user":
      return {
        label: "Account",
        className: "border-cal-badge-violet/30 bg-cal-badge-violet/15 text-cal-ink",
      };
    case "security":
      return {
        label: "Security",
        className: "border-cal-error/25 bg-cal-error/10 text-cal-ink",
      };
    case "content":
      return {
        label: "Approval",
        className: "border-cal-brand-accent/25 bg-cal-brand-accent/10 text-cal-ink",
      };
    case "notes":
      return {
        label: "Patient notes",
        className: "border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink",
      };
    case "system":
      return {
        label: "System",
        className: "border-cal-hairline bg-cal-surface-soft text-cal-ink",
      };
    default:
      return {
        label: "General",
        className: "border-cal-hairline bg-cal-surface-soft text-cal-muted",
      };
  }
};

const getNotificationIcon = (type, severity) => {
  switch (type) {
    case "feedback":
      return (
        <MessageSquare
          size={15}
          className={
            severity === "warning" ? "text-cal-warning" : "text-cal-ink"
          }
          aria-hidden="true"
        />
      );
    case "staff":
    case "user":
      return (
        <UserPlus
          size={15}
          className="text-cal-badge-violet"
          aria-hidden="true"
        />
      );
    case "case":
    case "clinical":
      return (
        <Activity size={15} className="text-cal-error" aria-hidden="true" />
      );
    case "security":
      return (
        <ShieldAlert size={15} className="text-cal-error" aria-hidden="true" />
      );
    case "system":
      return (
        <SettingsIcon
          size={15}
          className="text-cal-muted"
          aria-hidden="true"
        />
      );
    case "content":
      return (
        <ClipboardCheck
          size={15}
          className="text-cal-brand-accent"
          aria-hidden="true"
        />
      );
    case "notes":
      return (
        <StickyNote
          size={15}
          className="text-cal-success"
          aria-hidden="true"
        />
      );
    default:
      return (
        <Info size={15} className="text-cal-muted" aria-hidden="true" />
      );
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
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
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
  } catch {
    return isoString;
  }
};

const Notifications = () => {
  const navigate = useNavigate();
  const { userId, user } = useAuth();
  const isExpert = user?.role === "medical_expert";

  const queryClient = useQueryClient();
  const notificationsQuery = useApiQuery(NOTIFICATIONS_PATH);
  const notifications = notificationsQuery.data?.items ?? NO_NOTIFICATIONS;
  const loading = notificationsQuery.isPending;
  const refreshing = notificationsQuery.isFetching;
  const fetchError = notificationsQuery.isError;

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unread' | 'read' | 'archived'
  const [typeFilter, setTypeFilter] = useState("all");

  // Pagination states
  const [page, setPage] = useState(1);
  const pageSize = 12;

  const markReadOnScreen = (shouldMark, allRead = false) =>
    markNotificationsRead(
      queryClient,
      NOTIFICATIONS_KEY,
      userId,
      shouldMark,
      allRead
    );

  // Mark single item as read
  const markAsRead = async (id, e) => {
    if (e) e.stopPropagation();

    const undo = markReadOnScreen((n) => n.id === id);

    try {
      await apiFetch(`/api/admin/notifications/${id}/read`, { method: "PUT" });
    } catch (error) {
      console.error("Failed to mark as read:", error);
      undo();
      toast.error("Unable to update notification status.");
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    const undo = markReadOnScreen(() => true, true);

    try {
      await apiFetch("/api/admin/notifications/mark-all-read", { method: "PUT" });
      toast.success("All notifications marked as read.");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      undo();
      toast.error("Unable to mark all notifications as read.");
    }
  };

  const handleNavigate = (id, route) => {
    markAsRead(id);
    if (route) {
      navigate(route);
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    const isRead = n.read_by?.includes(userId);

    // Status filter: archived notifications only show under "Archived"
    if ((statusFilter === "archived") !== Boolean(n.archived)) return false;
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
  const unreadItemsCount = activeNotifications.filter(
    (n) => !n.read_by?.includes(userId)
  ).length;
  const clinicalCasesCount = notifications.filter(
    (n) => n.type === "case" || n.type === "clinical"
  ).length;
  const feedbackTicketsCount = notifications.filter(
    (n) => n.type === "feedback"
  ).length;
  const approvalsCount = notifications.filter(
    (n) => n.type === "content"
  ).length;
  const patientNotesCount = notifications.filter(
    (n) => n.type === "notes"
  ).length;

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / pageSize) || 1;
  const paginatedNotifications = filteredNotifications.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const handleClearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTypeFilter("all");
    setPage(1);
  };

  const isFilterActive =
    searchQuery.trim() !== "" || statusFilter !== "all" || typeFilter !== "all";

  const rangeStart =
    filteredNotifications.length === 0
      ? 0
      : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, filteredNotifications.length);

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1440px] space-y-6 font-cal-sans text-cal-ink">
        {/* ─── 1. EDITORIAL PAGE HEADER ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2.5 inline-flex items-center gap-2 rounded-full border border-cal-hairline bg-cal-canvas px-3 py-1 text-[12px] font-medium text-cal-muted">
              <Bell size={13.5} className="text-cal-ink" />
              <span>System alerts · Real-time activity inbox</span>
            </div>
            <h2 className="font-cal-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.8px] leading-[1.15] text-cal-ink">
              Notifications &amp; alerts
            </h2>
            <p className="mt-1.5 max-w-[64ch] text-[14px] leading-[1.5] text-cal-muted">
              {isExpert
                ? "Pending recipe and exercise approvals, cardiologist guidance notices, and care team patient-note replies."
                : "Real-time feed of clinical escalations, support inquiries, staff events, and system security alerts."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => notificationsQuery.refetch()}
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-[8px] border border-cal-hairline bg-cal-canvas px-4 text-[13.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh notifications"
            >
              <RotateCw
                size={14}
                className={refreshing ? "animate-spin text-cal-muted" : "text-cal-muted"}
                aria-hidden="true"
              />
              <span>Refresh</span>
            </button>

            {unreadItemsCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-5 text-[13.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
              >
                <CheckCheck size={15} aria-hidden="true" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── 2. KPI SUMMARY STRIP ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Total alerts
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-ink">
                <Bell size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : totalCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Active inbox entries
            </div>
          </div>

          <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-cal-muted">
                Unread alerts
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-brand-accent/25 bg-cal-brand-accent/10 text-cal-brand-accent">
                <AlertCircle size={14.5} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
              {loading ? "—" : unreadItemsCount}
            </div>
            <div className="mt-2 text-[12px] text-cal-muted">
              Requires administrative review
            </div>
          </div>

          {isExpert ? (
            <>
              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Approvals
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-brand-accent/25 bg-cal-brand-accent/10 text-cal-brand-accent">
                    <ClipboardCheck size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {loading ? "—" : approvalsCount}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Content awaiting verification
                </div>
              </div>

              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Patient notes
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-badge-emerald/35 bg-cal-badge-emerald/15 text-cal-ink">
                    <StickyNote size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {loading ? "—" : patientNotesCount}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Replies &amp; cardiologist guidance
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Clinical cases
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-error/25 bg-cal-error/10 text-cal-error">
                    <Activity size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {loading ? "—" : clinicalCasesCount}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  Case reviews &amp; evaluations
                </div>
              </div>

              <div className="rounded-[12px] border border-cal-hairline bg-cal-canvas p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12.5px] font-medium text-cal-muted">
                    Feedback &amp; support
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cal-warning/35 bg-cal-warning/15 text-cal-ink">
                    <MessageSquare size={14.5} aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-2 font-cal-display text-[28px] font-semibold tracking-[-0.6px] leading-none tabular-nums text-cal-ink">
                  {loading ? "—" : feedbackTicketsCount}
                </div>
                <div className="mt-2 text-[12px] text-cal-muted">
                  User tickets &amp; inquiries
                </div>
              </div>
            </>
          )}
        </div>

        {/* ─── 3. MAIN INBOX CARD: FILTERS & FEED ───────────────────────────── */}
        <section className="overflow-hidden rounded-[12px] border border-cal-hairline bg-cal-canvas shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {/* Status Tabs Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline bg-cal-canvas px-4 py-3 sm:px-5">
            <div
              role="group"
              aria-label="Filter notifications by read status"
              className="relative inline-flex flex-wrap items-center gap-1 rounded-[16px] sm:rounded-full border border-cal-hairline/80 bg-cal-surface-soft p-1"
            >
              {[
                { key: "all", label: "All", count: totalCount },
                { key: "unread", label: "Unread", count: unreadItemsCount, dot: true },
                { key: "read", label: "Read" },
                { key: "archived", label: "Archived", count: archivedCount, title: "Notifications archive 72 hours after creation" },
              ].map((tab) => {
                const active = statusFilter === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setStatusFilter(tab.key);
                      setPage(1);
                    }}
                    title={tab.title}
                    className={`relative flex items-center gap-1.5 rounded-full px-3.5 py-1 text-[13px] font-medium transition-colors cursor-pointer select-none ${
                      active
                        ? "text-white font-semibold"
                        : "text-cal-muted hover:text-cal-ink"
                    }`}
                  >
                    {active && (
                      <motion.div
                        layoutId="notifications-status-filter-tab"
                        className="absolute inset-0 rounded-full bg-cal-primary shadow-xs"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    {tab.dot && (
                      <span
                        className={`relative z-10 h-1.5 w-1.5 rounded-full ${
                          active ? "bg-white" : "bg-cal-brand-accent"
                        }`}
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                    {tab.count !== undefined && (
                      <span
                        className={`relative z-10 font-cal-mono text-[11.5px] tabular-nums ${
                          active ? "text-white/90 font-medium" : "text-cal-muted-soft"
                        }`}
                      >
                        {loading ? "—" : tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full sm:w-72">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cal-muted-soft"
              />
              <input
                type="text"
                aria-label="Search notifications"
                placeholder="Search alerts by title or message…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="h-9 w-full rounded-[8px] border border-cal-hairline bg-cal-canvas pl-9 pr-8 text-[13.5px] text-cal-ink placeholder:text-cal-muted-soft focus:border-cal-ink focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-cal-muted hover:text-cal-ink cursor-pointer"
                >
                  <X size={13.5} />
                </button>
              )}
            </div>
          </div>

          {/* Secondary Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cal-hairline bg-cal-surface-soft/40 px-4 py-2.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <select
                  aria-label="Filter by notification type"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 appearance-none rounded-[6px] border border-cal-hairline bg-cal-canvas pl-3 pr-8 text-[12.5px] font-medium text-cal-ink focus:border-cal-ink focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="all">All alert types</option>
                  {isExpert ? (
                    <>
                      <option value="content">Approvals</option>
                      <option value="notes">Patient notes</option>
                    </>
                  ) : (
                    <>
                      <option value="feedback">Feedback</option>
                      <option value="case">Clinical cases</option>
                      <option value="staff">Staff accounts</option>
                      <option value="user">User accounts</option>
                      <option value="security">Security</option>
                      <option value="system">System</option>
                    </>
                  )}
                </select>
                <ChevronDown
                  size={13}
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-cal-muted"
                />
              </div>

              {isFilterActive && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-cal-hairline bg-cal-canvas px-2.5 text-[12px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                >
                  <RotateCw size={12} className="text-cal-muted" />
                  <span>Reset filters</span>
                </button>
              )}
            </div>

            <div className="font-cal-mono text-[12px] tabular-nums text-cal-muted">
              {filteredNotifications.length}{" "}
              {filteredNotifications.length === 1 ? "alert" : "alerts"}
            </div>
          </div>

          {/* Error Banner */}
          {fetchError && (
            <div className="border-b border-cal-hairline px-6 py-4">
              <LoadError
                what="notifications feed"
                onRetry={notificationsQuery.refetch}
                className="py-1"
              />
            </div>
          )}

          {/* ── NOTIFICATIONS FEED ── */}
          <div className="divide-y divide-cal-hairline">
            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="flex items-start gap-3.5">
                    <Skeleton className="h-9 w-9 rounded-full bg-cal-surface-card shrink-0" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48 rounded bg-cal-surface-card" />
                      <Skeleton className="h-3 w-80 rounded bg-cal-surface-card" />
                    </div>
                    <Skeleton className="h-8 w-20 rounded-[8px] bg-cal-surface-card ml-auto" />
                  </div>
                ))}
              </div>
            ) : paginatedNotifications.length > 0 ? (
              paginatedNotifications.map((n) => {
                const isRead = n.read_by?.includes(userId);
                const badge = getNotificationBadge(n.type);

                return (
                  <div
                    key={n.id}
                    onClick={() => handleNavigate(n.id, n.route)}
                    className={`flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 transition-colors group cursor-pointer ${
                      isRead
                        ? "bg-cal-canvas hover:bg-cal-surface-soft/60"
                        : "bg-cal-surface-soft/80 hover:bg-cal-surface-card"
                    }`}
                  >
                    {/* Left Icon + Details */}
                    <div className="flex items-start gap-3.5 flex-1 min-w-0">
                      {/* Unread indicator */}
                      <div className="pt-2 flex items-center justify-center shrink-0">
                        {!isRead ? (
                          <span className="h-2 w-2 rounded-full bg-cal-brand-accent ring-2 ring-cal-canvas" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-transparent" />
                        )}
                      </div>

                      {/* Icon */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas text-cal-ink">
                        {getNotificationIcon(n.type, n.severity)}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4
                            className={`text-[13.5px] leading-snug truncate ${
                              isRead
                                ? "font-semibold text-cal-ink"
                                : "font-bold text-cal-ink"
                            }`}
                          >
                            {n.title}
                          </h4>
                          <span className={`${PILL} ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>

                        <p className="text-[13px] text-cal-body line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2.5 font-cal-mono text-[11.5px] tabular-nums text-cal-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={11} aria-hidden="true" />
                            <span>{formatRelativeTime(n.created_at)}</span>
                          </span>
                          <span>•</span>
                          <span>{formatFullDate(n.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Actions */}
                    <div
                      className="flex items-center gap-2 sm:self-center shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-cal-hairline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {n.route && (
                        <button
                          type="button"
                          onClick={() => handleNavigate(n.id, n.route)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer"
                        >
                          <span>Open</span>
                          <ExternalLink size={12} className="text-cal-muted" />
                        </button>
                      )}

                      {!isRead ? (
                        <button
                          type="button"
                          onClick={(e) => markAsRead(n.id, e)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-3 text-[12.5px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                          title="Mark as read"
                        >
                          <Check size={13} />
                          <span>Mark read</span>
                        </button>
                      ) : (
                        <span className="px-2 py-1 text-[11.5px] font-medium text-cal-muted">
                          Read
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-14 text-center">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-soft text-cal-muted">
                    <Bell size={18} aria-hidden="true" />
                  </div>
                  <p className="text-[14px] font-semibold text-cal-ink">
                    No notifications found
                  </p>
                  <p className="max-w-sm text-[13px] text-cal-muted">
                    {isFilterActive
                      ? "No alerts match your applied filter or search parameters."
                      : "You are completely caught up with all administrative notifications."}
                  </p>
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="mt-1 inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-4 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                    >
                      <RotateCw size={13.5} />
                      <span>Reset filters</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── PAGINATION CONTROLS ── */}
          {filteredNotifications.length > 0 && (
            <div className="flex flex-col justify-between gap-3 border-t border-cal-hairline bg-cal-canvas px-4 py-3 sm:flex-row sm:items-center sm:px-5">
              <span className="text-[12.5px] text-cal-muted">
                Showing{" "}
                <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                  {rangeStart}–{rangeEnd}
                </span>{" "}
                of{" "}
                <span className="font-cal-mono font-semibold tabular-nums text-cal-ink">
                  {filteredNotifications.length}
                </span>{" "}
                alerts
              </span>

              <div className="flex items-center gap-2">
                <span className="font-cal-mono text-[12px] tabular-nums text-cal-muted">
                  Page {page} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={14} aria-hidden="true" />
                  <span>Previous</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-cal-hairline bg-cal-canvas px-3 text-[12.5px] font-semibold text-cal-ink hover:bg-cal-surface-soft transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span>Next</span>
                  <ChevronRight size={14} aria-hidden="true" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};

export default Notifications;
