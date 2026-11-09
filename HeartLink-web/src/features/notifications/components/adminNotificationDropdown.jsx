import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  CheckCheck,
  ClipboardCheck,
  ExternalLink,
  Info,
  MessageSquare,
  RotateCw,
  Settings,
  ShieldAlert,
  StickyNote,
  UserPlus,
  X,
} from "lucide-react";
import { apiFetch } from "../../../lib/api.js";
import { useApiQuery } from "../../../hooks/useApiQuery.js";
import { useLiveNotifications } from "../../../hooks/useLiveNotifications.js";
import { markNotificationsRead } from "../../../utils/notificationCache.js";
import { useAuth } from "../../../contexts/useAuth.js";
import { safeNotificationRoute } from "../../../app/access.js";
import { Skeleton } from "../../../components/ui/skeleton.jsx";
import { QueryProgress } from "../../../components/ui/queryProgress.jsx";

const BELL_PATH = "/api/admin/notifications";
const BELL_KEY = ["api", BELL_PATH];
const NO_NOTIFICATIONS = [];

export default function AdminNotificationDropdown({ userId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [actionError, setActionError] = useState(null);
  const dropdownRef = useRef(null);
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  // HL-041: refreshes the moment notifications change (a live stream from the server), plus when the tab gets
  // focus, when the bell is opened and after any save; no more checking every 60 seconds
  const queryClient = useQueryClient();
  const notificationsQuery = useApiQuery(BELL_PATH);
  useLiveNotifications();
  const accessDenied = notificationsQuery.isError && notificationsQuery.error?.status === 403;
  const notifications = accessDenied ? NO_NOTIFICATIONS : notificationsQuery.data?.items ?? NO_NOTIFICATIONS;
  const unreadCount = accessDenied ? 0 : notificationsQuery.data?.unread_count || 0;
  const isLoading = notificationsQuery.isPending;
  const fetchError = notificationsQuery.isError ? "Unable to load notifications." : null;

  useEffect(() => {
    if (!isOpen) return;
    panelRef.current?.focus();

    const closeOutside = (event) => {
      if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      bellRef.current?.focus();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("focusin", closeOutside);
    dropdownRef.current?.addEventListener("keydown", closeOnEscape);
    const dropdown = dropdownRef.current;
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("focusin", closeOutside);
      dropdown?.removeEventListener("keydown", closeOnEscape);
    };
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

      const destination = safeNotificationRoute(user, route);
      if (destination) {
        navigate(destination);
        setIsOpen(false);
      } else if (route) {
        setActionError("This destination is no longer available for your account.");
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
    switch (type) {
      case "feedback":
        return (
          <MessageSquare
            size={14}
            className={severity === "warning" ? "text-cal-warning" : "text-cal-ink"}
          />
        );
      case "staff":
        return <UserPlus size={14} className="text-cal-ink" />;
      case "security":
        return <ShieldAlert size={14} className="text-cal-error" />;
      case "system":
        return <Settings size={14} className="text-cal-muted" />;
      // HL-082: experts' notifications
      case "content":
        return <ClipboardCheck size={14} className="text-cal-ink" />;
      case "notes":
        return <StickyNote size={14} className="text-cal-ink" />;
      default:
        return <Info size={14} className="text-cal-muted" />;
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
    <div className="relative font-cal-sans" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        ref={bellRef}
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-controls={isOpen ? "notification-popover" : undefined}
        title={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
        className={`relative flex h-9 w-9 items-center justify-center rounded-[8px] border bg-cal-canvas transition-colors cursor-pointer ${
          isOpen
            ? "border-cal-ink text-cal-ink bg-cal-surface-soft"
            : "border-cal-hairline text-cal-body hover:bg-cal-surface-soft hover:text-cal-ink"
        }`}
      >
        <Bell
          size={15}
          strokeWidth={1.95}
          className={unreadCount > 0 ? "text-cal-ink" : ""}
        />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-2 w-2 rounded-full bg-cal-primary ring-2 ring-cal-canvas" />
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          id="notification-popover"
          role="dialog"
          aria-labelledby="notification-popover-title"
          tabIndex={-1}
          className="notification-panel"
        >
          {/* Header */}
          <div className="notification-panel-header">
            <div className="flex items-center gap-2">
              <h3 id="notification-popover-title" className="text-[15px] font-semibold text-cal-ink">Notifications</h3>
              {unreadCount > 0 && (
                <span className="notification-panel-count">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1 text-[12px] font-semibold text-cal-ink hover:underline cursor-pointer"
              >
                <CheckCheck size={13} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Action Error Banner */}
          {actionError && (
            <div role="alert" className="flex items-center justify-between border-b border-cal-error/20 bg-cal-error/5 px-3.5 py-2 text-[12px] font-medium text-cal-ink">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0 text-cal-error" />
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                className="ml-2 text-cal-muted hover:text-cal-ink cursor-pointer"
                aria-label="Dismiss error"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Background Refresh Warning */}
          {fetchError && notifications.length > 0 && (
            <div className="flex items-center justify-between border-b border-cal-warning/25 bg-cal-warning/10 px-3.5 py-2 text-[12px] font-medium text-cal-ink">
              <div className="flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0 text-cal-warning" />
                <span>Unable to refresh latest updates.</span>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="ml-2 font-semibold text-cal-ink underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {notificationsQuery.isFetching && !isLoading && (
            <div className="border-b border-cal-hairline px-4 py-2">
              <QueryProgress active label="Updating notifications…" />
            </div>
          )}

          {/* List */}
          <div
            className="notification-panel-list"
            aria-busy={notificationsQuery.isFetching}
          >
            {isLoading && notifications.length === 0 ? (
              <div className="space-y-5 p-4">
                <span role="status" className="sr-only">Loading notifications…</span>
                {[1, 2, 3].map((row) => (
                  <div key={row} className="flex gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-36 max-w-full" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : fetchError && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-11 text-center">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-card text-cal-error">
                  <AlertCircle size={16} />
                </div>
                <p className="text-[13.5px] font-semibold text-cal-ink">
                  Unable to load notifications
                </p>
                <p className="mt-1 mb-3.5 text-[12.5px] text-cal-muted">
                  Please check your network connection and try again.
                </p>
                <button
                  type="button"
                  onClick={handleRetry}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[8px] bg-cal-primary active:bg-cal-primary-active px-3.5 text-[13px] font-semibold text-cal-on-primary transition-colors cursor-pointer"
                >
                  <RotateCw size={13} />
                  <span>Retry</span>
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-11 text-center">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-full border border-cal-hairline bg-cal-surface-card text-cal-muted">
                  <Bell size={16} />
                </div>
                <p className="text-[13.5px] font-semibold text-cal-ink">You&apos;re all caught up</p>
                <p className="mt-0.5 text-[12.5px] text-cal-muted">
                  No new notifications right now.
                </p>
              </div>
            ) : (
              <div className="flex flex-col divide-y divide-cal-hairline">
                {notifications.map((n) => {
                  const isRead = n.read_by?.includes(userId);
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markAsRead(n.id, n.route)}
                      className="notification-panel-item"
                      data-unread={!isRead}
                    >
                      {!isRead && <span className="sr-only">Unread: </span>}
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-cal-hairline bg-cal-canvas">
                        {getIcon(n.type, n.severity)}
                      </div>
                      <div className="min-w-0 flex-1 pr-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                          <p
                            className={`truncate text-[13px] leading-snug ${
                              isRead ? "font-medium text-cal-body" : "font-semibold text-cal-ink"
                            }`}
                          >
                            {n.title}
                          </p>
                          <span className="shrink-0 text-[11px] tabular-nums text-cal-muted">
                            {formatTime(n.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-cal-muted">
                          {n.message}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action: Jump to full inbox */}
          <div className="notification-panel-footer">
            <span className="font-medium text-cal-muted">Workspace inbox</span>
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate("/notifications");
              }}
              className="flex items-center gap-1 font-semibold text-cal-ink hover:underline cursor-pointer"
            >
              <span>View full inbox</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
